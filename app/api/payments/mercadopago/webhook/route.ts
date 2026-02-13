
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { ensureUserHasRole } from "@/lib/vip";

async function readPayload(req: Request) {
  // MP normalmente envia JSON, mas seja tolerante.
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await req.json().catch(() => ({} as any));
  }
  const raw = await req.text().catch(() => "");
  try {
    return JSON.parse(raw);
  } catch {
    // tenta querystring-like
    const sp = new URLSearchParams(raw);
    const obj: any = {};
    for (const [k, v] of sp.entries()) obj[k] = v;
    return obj;
  }
}

async function resolvePaymentFromEvent(accessToken: string, payload: any): Promise<{ paymentId?: string; payment?: any }>{
  const topic = payload?.type ?? payload?.topic;
  // formato comum: { data: { id: "PAYMENT_ID" } }
  const directId = payload?.data?.id ?? payload?.id ?? payload?.["data.id"];
  if (topic === "merchant_order" && directId) {
    // data.id é merchant_order_id
    const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${directId}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const mo = await moRes.json().catch(() => null);
    const payments = Array.isArray(mo?.payments) ? mo.payments : [];
    const last = payments.length ? payments[payments.length - 1] : null;
    const pid = last?.id ? String(last.id) : undefined;
    if (!pid) return {};
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${pid}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const payment = await payRes.json().catch(() => null);
    return { paymentId: pid, payment };
  }

  if (directId) {
    const pid = String(directId);
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${pid}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const payment = await payRes.json().catch(() => null);
    return { paymentId: pid, payment };
  }

  return {};
}

async function createEntitlement(userId: string, roleName: string, days: number | null | undefined, source: string) {
  if (!days || days <= 0) return;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  await prisma.entitlement.create({ data: { userId, roleName, expiresAt, source } });
}

/**
 * Webhook Mercado Pago.
 * - Armazena payload bruto em MpWebhookEvent
 * - Consulta API (se possível) para obter status
 * - Atualiza Purchase pelo external_reference (purchase.id)
 * - Quando pago, aplica cargo VIP conforme sku salvo na meta
 */
export async function POST(req: Request) {
  const payload = await readPayload(req);

  const event = await prisma.mpWebhookEvent.create({
    data: { payload: JSON.stringify(payload), eventType: payload?.type ?? payload?.topic ?? null, externalId: String(payload?.data?.id ?? "") || null },
    select: { id: true },
  });

  try {
    const accessToken = await (await import("@/lib/settings")).getMpAccessToken();
    if (accessToken) {
      const resolved = await resolvePaymentFromEvent(accessToken, payload);
      const paymentId = resolved.paymentId;
      const p = resolved.payment;
      const extRef = p?.external_reference ?? payload?.external_reference ?? payload?.externalReference;
      const status = p?.status;

      if (paymentId && extRef && status) {
        const mapped =
          status === "approved" ? "PAID" :
          status === "refunded" ? "REFUNDED" :
          status === "rejected" ? "FAILED" :
          "PENDING";

        const prev = await prisma.purchase.findUnique({ where: { id: extRef }, select: { meta: true } });
        let meta: any = {};
        try { meta = prev?.meta ? JSON.parse(prev.meta) : {}; } catch { meta = {}; }
        meta.paymentId = paymentId;
        meta.mpStatus = status;

        const updated = await prisma.purchase.update({
          where: { id: extRef },
          data: { status: mapped, meta: JSON.stringify(meta) },
        });

        // Garante que telas do usuário reflitam o status novo sem depender de cache
        try {
          revalidatePath("/account/purchases");
          revalidatePath("/store");
        } catch {
          // ignore (best-effort)
        }


        if (mapped === "PAID") {

          // Idempotência: evita aplicar benefícios/consumir cupom mais de uma vez
          if (meta?.benefitsApplied) {
            await prisma.mpWebhookEvent.update({ where: { id: event.id }, data: { processed: true } });
            await audit("payment.mp.webhook.duplicate_ignored", "Purchase", extRef, { paymentId, status });
            return NextResponse.json({ ok: true });
          }

          // Consome cupom (1 uso) quando confirmado
          if (meta?.couponCode && !meta?.couponConsumed) {
            const code = String(meta.couponCode).trim().toUpperCase();
            if (code) {
              await prisma.coupon.update({ where: { code }, data: { uses: { increment: 1 } } }).catch(() => null);
              meta.couponConsumed = true;
            }
          }

          await prisma.notification.create({ data: { userId: updated.userId, message: "💳 Pagamento confirmado! Seus itens foram creditados na conta.", href: "/store/purchases" } }).catch(() => null);
          // notificar staffs (SUPPORT+)
          const staff = await prisma.user.findMany({
            where: { isDeleted: false, role: { in: ["SUPPORT", "MODERATOR", "ADMIN", "OWNER"] } },
            select: { id: true },
          });
          const rows = staff
            .filter((s) => s.id !== updated.userId)
            .map((s) => ({ userId: s.id, message: "💳 Nova compra confirmada (Mercado Pago).", href: "/admin/store/purchases" }));
          if (rows.length) await prisma.notification.createMany({ data: rows }).catch(() => null);

          const items = await prisma.purchaseItem.findMany({ where: { purchaseId: updated.id } });
          for (const it of items) {
            if (it.grantPoints) {
              await prisma.user.update({ where: { id: updated.userId }, data: { points: { increment: it.grantPoints } } });
            }
            if (it.grantVipRole) {
              await ensureUserHasRole(updated.userId, it.grantVipRole);
              await createEntitlement(updated.userId, it.grantVipRole, it.durationDays ?? null, updated.id);
            }
          }

          meta.benefitsApplied = true;
          await prisma.purchase.update({ where: { id: updated.id }, data: { meta: JSON.stringify(meta) } }).catch(() => null);
        }

        await prisma.mpWebhookEvent.update({ where: { id: event.id }, data: { processed: true } });
        await audit("payment.mp.webhook.processed", "Purchase", extRef, { paymentId, status });
      }
    }
  } catch (e) {
    await audit("payment.mp.webhook.error", "MpWebhookEvent", event.id, { error: String(e) });
  }

  return NextResponse.json({ ok: true });
}
