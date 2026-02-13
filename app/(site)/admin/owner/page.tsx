import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import MpSettings from "./mp-settings";

export default async function OwnerPanel() {
  await requireRole("OWNER");

  const [usersCount, topicsCount, ticketsCount, purchasesCount, wlPending, wlApproved, deletedPosts, deletedTickets] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.topic.count({ where: { isDeleted: false } }),
    prisma.ticket.count({ where: { isDeleted: false } }),
    prisma.purchase.count(),
    prisma.user.count({ where: { whitelistStatus: "PENDING", isDeleted: false } }),
    prisma.user.count({ where: { whitelistStatus: "APPROVED", isDeleted: false } }),
    prisma.post.count({ where: { isDeleted: true } }),
    prisma.ticket.count({ where: { isDeleted: true } }),
  ]);

  const onlineSince = new Date(Date.now() - 5 * 60 * 1000);
  const onlineUsers = await prisma.user.findMany({
    where: { isDeleted: false, lastSeenAt: { gte: onlineSince } },
    select: { id: true, username: true, role: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });

  const topBuyers = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _sum: { amountCents: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 10,
  });

  const topBuyerUsers = await prisma.user.findMany({
    where: { id: { in: topBuyers.map((x) => x.userId) } },
    select: { id: true, username: true },
  });
  const buyerName = new Map(topBuyerUsers.map((u) => [u.id, u.username]));

  const topPosters = await prisma.post.groupBy({
  by: ["authorId"],
  where: { isDeleted: false },
  _count: { id: true },
  orderBy: { _count: { id: "desc" } },
  take: 10,
});


  const topPosterUsers = await prisma.user.findMany({
    where: { id: { in: topPosters.map((x) => x.authorId) } },
    select: { id: true, username: true },
  });
  const posterName = new Map(topPosterUsers.map((u) => [u.id, u.username]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel do Dono</h1>
        <p className="mt-1 text-sm text-white/55">Visão geral, ranking e dados sensíveis (somente OWNER).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5"><div className="text-xs text-white/45">Usuários</div><div className="text-2xl font-semibold mt-1">{usersCount}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Tópicos</div><div className="text-2xl font-semibold mt-1">{topicsCount}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Tickets</div><div className="text-2xl font-semibold mt-1">{ticketsCount}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Compras</div><div className="text-2xl font-semibold mt-1">{purchasesCount}</div></Card>

        <Card className="p-5"><div className="text-xs text-white/45">Whitelist pendente</div><div className="text-2xl font-semibold mt-1">{wlPending}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Whitelist aprovada</div><div className="text-2xl font-semibold mt-1">{wlApproved}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Posts removidos</div><div className="text-2xl font-semibold mt-1">{deletedPosts}</div></Card>
        <Card className="p-5"><div className="text-xs text-white/45">Tickets removidos</div><div className="text-2xl font-semibold mt-1">{deletedTickets}</div></Card>
      </div>

      <div className="mt-6"><MpSettings /></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="font-semibold">Top compradores</div>
          <div className="mt-3 space-y-2 text-sm">
            {topBuyers.map((b, i) => (
              <div key={b.userId} className="flex items-center justify-between">
                <div className="text-white/80">#{i+1} {buyerName.get(b.userId) ?? b.userId}</div>
                <Badge>R$ {(((b._sum.amountCents ?? 0) / 100).toFixed(2))}</Badge>
              </div>
            ))}
            {topBuyers.length === 0 && <div className="text-white/55">Sem compras pagas.</div>}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <div className="font-semibold">Top postadores</div>
          <div className="mt-3 space-y-2 text-sm">
            {topPosters.map((p, i) => (
              <div key={p.authorId} className="flex items-center justify-between">
                <div className="text-white/80">#{i+1} {posterName.get(p.authorId) ?? p.authorId}</div>
                <Badge>{p._count._all}</Badge>
              </div>
            ))}
            {topPosters.length === 0 && <div className="text-white/55">Sem posts.</div>}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-1">
          <div className="font-semibold">Usuários online (últimos 5 min)</div>
          <div className="mt-3 space-y-2 text-sm">
            {onlineUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <Link className="text-white/85 hover:text-white underline" href={`/profile/${u.id}`}>{u.username}</Link>
                <Badge>{u.role}</Badge>
              </div>
            ))}
            {onlineUsers.length === 0 && <div className="text-white/55">Ninguém online.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Dados bancários</div>
            <div className="text-sm text-white/55">Gerencie em /admin/owner/bank (API).</div>
          </div>
          <Link href="/admin/owner/bank" className="text-sm underline text-white/70 hover:text-white">Abrir</Link>
        </div>
      </Card>
    </div>
  );
}
