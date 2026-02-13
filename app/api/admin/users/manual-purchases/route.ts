import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ensureUserHasRole } from "@/lib/vip";

function safeJsonParse(value: unknown) {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try { return JSON.parse(value); } catch { return {}; }
}

async function createEntitlement(userId: string, roleName: string, days: number | null | undefined, source: string) {
  if (!days || days <= 0) return;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  await prisma.entitlement.create({ data: { userId, roleName, expiresAt, source } });
}

async function applyBenefitsOnce(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, select: { id: true, userId: true, status: true, meta: true } });
  if (!purchase || purchase.status !== "PAID") return;

  const meta = safeJsonParse(purchase.meta);
  if (meta?.benefitsApplied) return;

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

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ message: "userId é obrigatório" }, { status: 400 });

  const purchases = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json({ purchases });
}

export async function POST(req: Request) {
  await requireRole("ADMIN");
  const body = await req.json().catch(() => ({} as any));
  const action = String(body?.action || "");

  if (action === "grant") {
    const userId = String(body?.userId || "");
    const productId = String(body?.productId || "");
    const quantity = Math.max(1, Math.min(100, Number(body?.quantity ?? 1)));
    if (!userId || !productId) return NextResponse.json({ message: "userId/productId obrigatórios" }, { status: 400 });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, name: true, priceCents: true, currency: true, durationDays: true, grantPoints: true, grantVipRole: true, mtaActions: true, isActive: true },
    });
    if (!product) return NextResponse.json({ message: "Produto não encontrado" }, { status: 404 });

    const items = Array.from({ length: quantity }).map(() => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      priceCents: product.priceCents,
      durationDays: product.durationDays ?? null,
      grantPoints: product.grantPoints ?? 0,
      grantVipRole: product.grantVipRole ?? null,
      mtaActions: product.mtaActions ?? null,
    }));

    const meta = {
      manual: true,
      manualGrantedAt: new Date().toISOString(),
      quantity,
      productSku: product.sku,
    };

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        provider: "MANUAL",
        status: "PAID",
        amountCents: (product.priceCents || 0) * quantity,
        currency: product.currency || "BRL",
        meta: JSON.stringify(meta),
        items: { create: items },
      },
      include: { items: true },
    });

    await applyBenefitsOnce(purchase.id);
    await prisma.notification.create({ data: { userId, message: `🎁 Compra atribuída manualmente: ${product.name} x${quantity}.`, href: "/account/purchases" } }).catch(() => null);
    await audit("admin.purchase.manual.grant", "Purchase", purchase.id, { userId, productId, quantity, sku: product.sku });

    return NextResponse.json({ ok: true, purchase });
  }

  if (action === "revoke") {
    const purchaseId = String(body?.purchaseId || "");
    if (!purchaseId) return NextResponse.json({ message: "purchaseId obrigatório" }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId }, include: { items: true } });
    if (!purchase) return NextResponse.json({ message: "Compra não encontrada" }, { status: 404 });

    // Marca como reembolsada (não conta mais para whitelist/loja)
    const meta = safeJsonParse(purchase.meta);
    meta.revokedAt = new Date().toISOString();
    meta.revoked = true;

    await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "REFUNDED", meta: JSON.stringify(meta) } });

    // Reverte pontos (best-effort)
    const totalPoints = purchase.items.reduce((acc, it) => acc + (it.grantPoints ?? 0), 0);
    if (totalPoints) {
      await prisma.user.update({ where: { id: purchase.userId }, data: { points: { decrement: totalPoints } } }).catch(() => null);
    }

    // Remove entitlements criados por esta compra
    await prisma.entitlement.deleteMany({ where: { userId: purchase.userId, source: purchaseId } }).catch(() => null);

    await prisma.notification.create({ data: { userId: purchase.userId, message: "🧾 Uma compra foi revogada pela staff.", href: "/account/purchases" } }).catch(() => null);
    await audit("admin.purchase.manual.revoke", "Purchase", purchaseId, { userId: purchase.userId, provider: purchase.provider });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Ação inválida" }, { status: 400 });
}
