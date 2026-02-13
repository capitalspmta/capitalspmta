import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function RankingPage() {
  await requireUser(); // qualquer logado vê

  const topPoints = await prisma.user.findMany({ where: { isDeleted: false }, orderBy: { points: "desc" }, take: 10, select: { id: true, username: true, points: true, role: true } });

  const topBuy = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _sum: { amountCents: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 10,
  });
  const buyUsers = await prisma.user.findMany({ where: { id: { in: topBuy.map(b => b.userId) } }, select: { id: true, username: true, role: true } });
  // Tipos explícitos para evitar inferência como `unknown` em builds mais estritos.
  const buyMap = new Map<string, { id: string; username: string; role: string }>(buyUsers.map((u) => [u.id, u] as const));

  const topTopics = await prisma.topic.groupBy({ by: ["authorId"], where: { isDeleted: false }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 });
  const topPosts = await prisma.post.groupBy({ by: ["authorId"], where: { isDeleted: false }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 10 });
  const ids = Array.from(new Set([...topTopics.map(t => t.authorId), ...topPosts.map(p => p.authorId)]));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, role: true } });
  const uMap = new Map<string, { id: string; username: string; role: string }>(users.map((u) => [u.id, u] as const));
  const postScore = new Map<string, { topics: number; posts: number }>();
  for (const t of topTopics) postScore.set(t.authorId, { topics: t._count.id, posts: 0 });
  for (const p of topPosts) postScore.set(p.authorId, { topics: postScore.get(p.authorId)?.topics ?? 0, posts: p._count.id });
  const combined = Array.from(postScore.entries()).map(([userId, v]) => ({ userId, ...v, total: v.topics + v.posts })).sort((a,b)=>b.total-a.total).slice(0,10);

  const topStaff = await prisma.ticket.groupBy({
    by: ["closedById"],
    where: { status: "CLOSED", closedById: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });
  const staffIds = topStaff.map(s => s.closedById!).filter(Boolean);
  const staffUsers = await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, username: true, role: true } });
  const sMap = new Map<string, { id: string; username: string; role: string }>(staffUsers.map((u) => [u.id, u] as const));

  const topTicketMsgs = await prisma.ticketMessage.groupBy({
    by: ["authorId"],
    where: { isDeleted: false },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const msgUsers = await prisma.user.findMany({ where: { id: { in: topTicketMsgs.map(m => m.authorId) } }, select: { id: true, username: true, role: true } });
  const mMap = new Map<string, { id: string; username: string; role: string }>(msgUsers.map((u) => [u.id, u] as const));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">TOP RANKING</h1>
        <Link className="text-sm underline" href="/forum">Voltar</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <section className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <h2 className="font-semibold">Top Compradores</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {topBuy.map((b, idx) => (
              <li key={b.userId} className="flex justify-between">
                <span>#{idx+1} {buyMap.get(b.userId)?.username ?? "?"}</span>
                <span>R$ {(((b._sum.amountCents ?? 0)/100)).toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <h2 className="font-semibold">Top Postadores</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {combined.map((c, idx) => (
              <li key={c.userId} className="flex justify-between">
                <span>#{idx+1} {uMap.get(c.userId)?.username ?? "?"}</span>
                <span>{c.total} (Tópicos {c.topics} / Respostas {c.posts})</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <h2 className="font-semibold">Top Staff (Tickets Fechados)</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {topStaff.map((s, idx) => (
              <li key={s.closedById ?? idx} className="flex justify-between">
                <span>#{idx+1} {s.closedById ? (sMap.get(s.closedById)?.username ?? "?") : "?"}</span>
                <span>{s._count.id}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <h2 className="font-semibold">Top Mensagens (Tickets)</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {topTicketMsgs.map((m, idx) => (
              <li key={m.authorId} className="flex justify-between">
                <span>#{idx+1} {mMap.get(m.authorId)?.username ?? "?"}</span>
                <span>{m._count.id}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl bg-white/5 p-4 border border-white/10 md:col-span-2">
          <h2 className="font-semibold">Top Pontos</h2>
          <ol className="mt-3 grid md:grid-cols-2 gap-2 text-sm">
            {topPoints.map((u, idx) => (
              <li key={u.id} className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <span>#{idx+1} {u.username}</span>
                <span>{u.points} pts</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
