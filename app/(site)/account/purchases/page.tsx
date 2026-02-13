export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import PurchasesAutoRefresh from "@/components/PurchasesAutoRefresh";

function safeParseMeta(meta: string | null): any {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function summarizeItems(p: { meta: string | null; items: { sku: string; name: string }[] }) {
  const meta = safeParseMeta(p.meta);
  const map = new Map<string, { name: string; qty: number }>();

  for (const it of p.items || []) {
    const key = it.sku || it.name;
    const prev = map.get(key);
    if (prev) prev.qty += 1;
    else map.set(key, { name: it.name || it.sku, qty: 1 });
  }

  // Coins: guardamos quantidade no meta
  if (meta?.type === "COINS" && Number.isFinite(meta?.coins)) {
    map.set("CAPITAL_COINS", { name: "Capital Coins", qty: Number(meta.coins) });
  }

  return Array.from(map.values());
}

export default async function PurchasesPage() {
  const user = await requireUser();
  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { sku: true, name: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PurchasesAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas compras</h1>
        <p className="mt-1 text-sm text-white/55">Histórico, itens e status (PENDING/PAID/FAILED/REFUNDED).</p>
      </div>

      <Card className="p-5">
        <div className="divide-y divide-white/10">
          {purchases.map((p) => {
            const items = summarizeItems(p as any);
            const itemsLabel = items.length
              ? items.map((x) => `${x.name} x${x.qty}`).join(" • ")
              : "—";

            return (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-white/85 truncate">{itemsLabel}</div>
                  <div className="text-xs text-white/45 mt-1">{p.provider} • {p.externalId ?? "—"}</div>
                  <div className="text-xs text-white/45 mt-1">{new Date(p.createdAt).toLocaleString("pt-BR")}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{p.status}</Badge>
                  <Badge>R$ {(p.amountCents / 100).toFixed(2)}</Badge>
                </div>
              </div>
            );
          })}
          {purchases.length === 0 && <div className="py-6 text-sm text-white/55">Nenhuma compra ainda.</div>}
        </div>
      </Card>
    </div>
  );
}
