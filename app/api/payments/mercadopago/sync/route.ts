import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ensureUserHasRole } from "@/lib/vip";

function mapMpStatus(status: string | null | undefined): "PAID" | "PENDING" | "FAILED" | "REFUNDED" {
  if (!status) return "PENDING";
  if (status === "approved") return "PAID";
  if (status === "refunded" || status === "charged_back") return "REFUNDED";
  if (status === "rejected" || status === "cancelled") return "FAILED";
  return "PENDING";
}

async function createEntitlement(userId: string, roleName: string, days: number | null | undefined, source: string) {
  if (!days || days <= 0) return;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  await prisma.entitlement.create({ data: { userId, roleName, expiresAt, source } });
}

async function applyBenefitsOnce(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, select: { id: true, userId: true, status: true } });
  if (!purchase) return;
  if (purchase.status !== "PAID") return;

  // Idempotência: só aplica se ainda não houver log/meta de aplicação.
  const prev = await prisma.purchase.findUnique({ where: { id: purchaseId }, select: { meta: true } });
  let meta: any = {};
  try { meta = prev?.meta ? JSON.parse(prev.meta) : {}; } catch { meta = {}; }
  if (meta?.benefitsApplied) return;

  // Consome cupom (1 uso) quando a compra é confirmada, evitando contar abandonos.
  if (meta?.couponCode && !meta?.couponConsumed) {
    const code = String(meta.couponCode).trim().toUpperCase();
    if (code) {
      await prisma.coupon.update({
        where: { code },
        data: { uses: { increment: 1 } },
      }).catch(() => null);
      meta.couponConsumed = true;
    }
  }

  const items = await prisma.purchaseItem.findMany({ where: { purchaseId } });
  for (const it of items) {
    if (it.grantPoints) {
      await prisma.user.update({ where: { id: purchase.userId }, data: { points: { increment: it.grantPoints } } });
    }
    if (it.grantVipRole) {
      await ensureUserHasRole(purchase.userId, it.grantVipRole);
      await createEntitlement(purchase.userId, it.grantVipRole, it.durationDays ?? null, purchaseId);
    }
  }

  meta.benefitsApplied = true;
  await prisma.purchase.update({ where: { id: purchaseId }, data: { meta: JSON.stringify(meta) } });
}

/**
 * Sync manual (sem webhook) para ambiente local.
 * - Busca pagamentos no MP por external_reference (purchase.id)
 * - Atualiza status no banco
 * - Quando vira PAID, aplica benefícios (pontos/VIP) e revalida páginas
 */
export async function POST(req: Request) {
  const user = await requireUserApi();

  const accessToken = await (await import("@/lib/settings")).getMpAccessToken();
  if (!accessToken) return NextResponse.json({ ok: false, error: "MP access token ausente" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const onlyPurchaseId: string | undefined = body?.purchaseId ? String(body.purchaseId) : undefined;

  const pending = await prisma.purchase.findMany({
    where: {
      userId: user.id,
      provider: "MERCADOPAGO",
      status: "PENDING",
      ...(onlyPurchaseId ? { id: onlyPurchaseId } : {}),
    },
    select: { id: true, meta: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  let updatedCount = 0;

  for (const pu of pending) {
    // Busca pagamentos por external_reference (purchase.id)
    const url = new URL("https://api.mercadopago.com/v1/payments/search");
    url.searchParams.set("external_reference", pu.id);
    url.searchParams.set("sort", "date_created");
    url.searchParams.set("criteria", "desc");

    const mpRes = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const mpJson = await mpRes.json().catch(() => null);
    const results: any[] = Array.isArray(mpJson?.results) ? mpJson.results : [];
    const best = results[0];
    const mpStatus: string | undefined = best?.status;
    const paymentId = best?.id ? String(best.id) : undefined;

    if (!mpStatus) continue;

    const mapped = mapMpStatus(mpStatus);
    if (mapped === "PENDING") continue;

    let meta: any = {};
    try { meta = pu.meta ? JSON.parse(pu.meta) : {}; } catch { meta = {}; }
    meta.paymentId = paymentId;
    meta.mpStatus = mpStatus;
    meta.syncedAt = new Date().toISOString();

    await prisma.purchase.update({
      where: { id: pu.id },
      data: { status: mapped, meta: JSON.stringify(meta) },
    });
    updatedCount += 1;

    if (mapped === "PAID") {
      await prisma.notification
        .create({ data: { userId: user.id, message: "💳 Pagamento confirmado! Seus itens foram creditados na conta.", href: "/store/purchases" } })
        .catch(() => null);
      await applyBenefitsOnce(pu.id);
    }

    await audit("payment.mp.sync", "Purchase", pu.id, { mapped, mpStatus, paymentId });
  }

  if (updatedCount > 0) {
    try {
      revalidatePath("/account/purchases");
      revalidatePath("/store");
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true, pendingCount: pending.length, updatedCount });
}
