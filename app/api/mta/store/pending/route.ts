import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMtaKey } from "@/lib/mta-auth";

function parseJsonText(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
export async function GET(req: Request) {
  const auth = requireMtaKey(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const serialRaw = (searchParams.get("serial") || "").trim();
  const serial = serialRaw.toUpperCase();
  const account = (searchParams.get("account") || "").trim();
  const login = (searchParams.get("login") || "").trim();
  const accountId = (searchParams.get("id") || searchParams.get("accountId") || "").trim();
  if (!serial || serial.length < 6) {
    return NextResponse.json({ message: "Serial inválido." }, { status: 400 });
  }

  // Busca resiliente:
  // 1) match exato do serial (normalizado)
  // 2) fallback para casos em que o serial foi salvo truncado (migração/bugs antigos)
  // 3) opcional: match por mtaAccount (conta do MTA) quando enviado pelo servidor
  let ga = await prisma.gameAccount.findUnique({ where: { mtaSerial: serial } });
  if (!ga) {
    ga = await prisma.gameAccount.findFirst({ where: { mtaSerial: { startsWith: serial.slice(0, 24) } } });
    // auto-heal: se achou por prefixo e o serial completo parece válido, atualiza.
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
  if (!ga) return NextResponse.json({ pending: [] });

  const purchases = await prisma.purchase.findMany({
    where: { userId: ga.userId, status: "PAID" },
    include: { items: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const itemIds = purchases.flatMap((p) => p.items.map((it) => it.id));
  // ⚠️ Importante: o client SQLite não tem o model MtaDelivery (varia por output/schema).
  // Para manter compatibilidade, usamos AuditLog como “marcador de entrega”.
  const deliveredLogs = itemIds.length
    ? await prisma.auditLog.findMany({
        where: {
          action: "mta.store.delivered",
          entityType: "PurchaseItem",
          entityId: { in: itemIds },
        },
        select: { entityId: true },
      })
    : [];
  const deliveredSet = new Set(deliveredLogs.map((d) => d.entityId).filter(Boolean) as string[]);

  const pending: any[] = [];

  for (const p of purchases) {
    for (const it of p.items) {
      if (deliveredSet.has(it.id)) continue;

      // Preferência: ações explícitas no item (mtaActions).
      // Compat: itens antigos podem não ter mtaActions, mas possuem grantVipRole/durationDays.
      let actions = parseJsonText((it as any).mtaActions);
      if (!actions.length) {
        const role = (it as any).grantVipRole as string | null | undefined;
        const days = (it as any).durationDays as number | null | undefined;
        if (role && typeof days === "number" && days > 0) {
          actions = [{ type: "vip", vipName: role, days }];
        }
      }
      if (!actions.length) continue;

      pending.push({
        purchaseId: p.id,
        purchaseItemId: it.id,
        sku: it.sku,
        name: it.name,
        actions,
      });
    }
  }

  return NextResponse.json({ pending });
}
