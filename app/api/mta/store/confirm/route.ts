import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMtaKey } from "@/lib/mta-auth";

export async function POST(req: Request) {
  const auth = requireMtaKey(req);
  if (auth) return auth;

  const body = (await req.json().catch(() => null)) as any;
  const serial = String(body?.serial || "").trim().toUpperCase();
  const account = String(body?.account || "").trim();
  const login = String(body?.login || body?.accountLogin || "").trim();
  const accountId = String(body?.id || body?.accountId || "").trim();
  const purchaseItemId = String(body?.purchaseItemId || "").trim();
  const purchaseId = body?.purchaseId ? String(body.purchaseId).trim() : null;

  if (!serial || serial.length < 6 || !purchaseItemId) {
    return NextResponse.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
  }

  // Mesma lógica resiliente do endpoint /pending
  let ga = await prisma.gameAccount.findUnique({ where: { mtaSerial: serial } });
  if (!ga) {
    ga = await prisma.gameAccount.findFirst({ where: { mtaSerial: { startsWith: serial.slice(0, 24) } } });
    if (ga && serial.length >= 24) {
      await prisma.gameAccount.update({ where: { id: ga.id }, data: { mtaSerial: serial } }).catch(() => null);
    }
  }
  if (!ga && (account || login || accountId)) {
    const l = login || account;
    const id = accountId;
    const ors: any[] = [];
    if (l) {
      ors.push({ mtaAccount: l });
      ors.push({ mtaAccount: { contains: `"login":"${l}"` } });
      ors.push({ mtaAccount: { contains: `"login": "${l}"` } });
    }
    if (id) {
      ors.push({ mtaAccount: { contains: `"id":"${id}"` } });
      ors.push({ mtaAccount: { contains: `"id": "${id}"` } });
    }
    ga = await prisma.gameAccount.findFirst({ where: { OR: ors } });
  }
  if (!ga) return NextResponse.json({ ok: false, message: "Serial/conta não vinculado." }, { status: 404 });

  const item = await prisma.purchaseItem.findUnique({
    where: { id: purchaseItemId },
    include: { purchase: true },
  });
  if (!item || item.purchase.userId !== ga.userId) {
    return NextResponse.json({ ok: false, message: "Item não pertence a este usuário." }, { status: 403 });
  }
  if (item.purchase.status !== "PAID") {
    return NextResponse.json({ ok: false, message: "Compra não está paga." }, { status: 409 });
  }

  // ⚠️ Compatibilidade: o client SQLite não tem o model MtaDelivery.
  // Marcamos entrega via AuditLog (idempotente no /pending).
  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "mta.store.delivered",
      entityType: "PurchaseItem",
      entityId: purchaseItemId,
      meta: JSON.stringify({
        userId: ga.userId,
        serial,
        purchaseId: purchaseId || item.purchaseId,
        confirmedAt: new Date().toISOString(),
      }),
    },
  });

  return NextResponse.json({ ok: true });
}
