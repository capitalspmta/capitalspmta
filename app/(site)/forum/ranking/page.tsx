import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { requireActiveUser } from "@/lib/guards";

type UserLite = { id: string; username: string; role: string };


function fmtMoneyBRL(cents: number) {
  const v = (cents || 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


function safeParseMeta(meta: string | null): any {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function summarizePurchaseItems(p: { meta: string | null; items: { sku: string; name: string }[] }) {
  const meta = safeParseMeta(p.meta);
  const map = new Map<string, { name: string; qty: number }>();
  for (const it of p.items || []) {
    const key = it.sku || it.name;
    const prev = map.get(key);
    if (prev) prev.qty += 1;
    else map.set(key, { name: it.name || it.sku, qty: 1 });
  }
  if (meta?.type === "COINS" && Number.isFinite(meta?.coins)) {
    map.set("CAPITAL_COINS", { name: "Capital Coins", qty: Number(meta.coins) });
  }
  return Array.from(map.values());
}

export default async function ForumRankingPage() {
  await requireActiveUser();

  const topPostersAgg = await prisma.post.groupBy({
    by: ["authorId"],
    where: { isDeleted: false },
    // Alguns clients/engines não suportam _all no groupBy.
    // Contamos por id (1 post = 1 row) para máxima compatibilidade.
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const posterUsers = await prisma.user.findMany({
    where: { id: { in: topPostersAgg.map(a => a.authorId) } },
    select: { id: true, username: true, role: true },
  });

  const posterMap = new Map<string, UserLite>(
    posterUsers.map((u): [string, UserLite] => [u.id, { id: u.id, username: u.username, role: u.role }])
  );

  const topPosters = topPostersAgg.flatMap((a) => {
    const u = posterMap.get(a.authorId);
    if (!u) return [];
    return [{ id: u.id, username: u.username, role: u.role, posts: a._count.id }];
  });


  // Top compradores (somente PAID)
  const buyersAgg = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _sum: { amountCents: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 20,
  });

  const buyerUsers = await prisma.user.findMany({
    where: { id: { in: buyersAgg.map(a => a.userId) } },
    select: { id: true, username: true, role: true },
  });
  const buyerMap = new Map<string, UserLite>(
    buyerUsers.map((u): [string, UserLite] => [u.id, { id: u.id, username: u.username, role: u.role }])
  );

  const topBuyers = buyersAgg.flatMap((a) => {
    const u = buyerMap.get(a.userId);
    if (!u) return [];
    return [{ id: u.id, username: u.username, role: u.role, spentCents: Number(a._sum.amountCents ?? 0) }];
  });


const recentPurchases = await prisma.purchase.findMany({
    where: { status: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      createdAt: true,
      meta: true,
      user: { select: { username: true } },
      items: { select: { sku: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fórum • Ranking</h1>
          <p className="mt-1 text-sm text-white/55">Top postadores e top compradores (com valor gasto).</p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link href="/forum" className="text-white/70 hover:text-white underline">Categorias</Link>
          <span className="text-white/35">•</span>
          <span className="text-white/85 font-semibold">Ranking</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top postadores</div>
            <Badge>{topPosters.length}</Badge>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {topPosters.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-white/80">
                  <span className="text-white/50">#{i + 1}</span>{" "}
                  <span className="font-semibold">{u.username}</span>{" "}
                  <span className="text-white/45">({u.role})</span>
                </div>
                <Badge>{u.posts} posts</Badge>
              </div>
            ))}
            {topPosters.length === 0 && <div className="text-white/55 py-6">Sem dados ainda.</div>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top compradores</div>
            <Badge>{topBuyers.length}</Badge>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {topBuyers.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-white/80">
                  <span className="text-white/50">#{i + 1}</span>{" "}
                  <span className="font-semibold">{u.username}</span>{" "}
                  <span className="text-white/45">({u.role})</span>
                </div>
                <Badge>{fmtMoneyBRL(u.spentCents)}</Badge>
              </div>
            ))}
            {topBuyers.length === 0 && <div className="text-white/55 py-6">Sem dados ainda.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Últimas compras</div>
          <Badge>{recentPurchases.length}</Badge>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {recentPurchases.map((p) => {
            const items = summarizePurchaseItems(p as any);
            const label = items.length ? items.map((x) => `${x.name} x${x.qty}`).join(" • ") : "—";
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-white/80">
                  <span className="font-semibold">{p.user.username}</span>
                  <span className="text-white/45"> • </span>
                  <span className="text-white/75">{label}</span>
                </div>
                <div className="text-xs text-white/40 whitespace-nowrap">{new Date(p.createdAt as any).toLocaleString("pt-BR")}</div>
              </div>
            );
          })}
          {recentPurchases.length === 0 && <div className="text-white/55 py-6">Sem compras ainda.</div>}
        </div>
      </Card>

    </div>
  );
}