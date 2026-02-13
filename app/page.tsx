import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) redirect("/banned");
  if (user.whitelistStatus !== "APPROVED") redirect("/whitelist");

  const topBuyers = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  }).catch(() => []);

  const buyerUsers = await prisma.user.findMany({
    where: { id: { in: (topBuyers as any[]).map((x) => x.userId) } },
    select: { id: true, username: true, role: true, avatarKey: true },
  }).catch(() => []);

  const buyerMap = new Map(buyerUsers.map((u) => [u.id, u]));

  const online = await prisma.user.findMany({
    where: { isDeleted: false, lastSeenAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
    select: { id: true, username: true, role: true, avatarKey: true, lastSeenAt: true },
    orderBy: { lastSeenAt: "desc" },
    take: 24,
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-white/60">Resumo do servidor e atividade do site.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/forum" className="text-sm text-white/80 hover:text-white">Ir para o Fórum</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Top compradores</div>
            <Badge>PAID</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {(topBuyers as any[]).length === 0 && <div className="text-sm text-white/60">Sem dados ainda.</div>}
            {(topBuyers as any[]).map((x, idx) => {
              const u = buyerMap.get(x.userId);
              return (
                <div key={x.userId} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                      <img src={`/avatars/${(u?.avatarKey || "avatar1")}.svg`} alt="avatar" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{idx + 1}. {u?.username ?? "Usuário"}</div>
                      <div className="text-xs text-white/55">{u?.role ?? ""}</div>
                    </div>
                  </div>
                  <div className="text-sm text-white/80">{x._count.id} compras</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Online agora</div>
            <Badge>{online.length}</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {online.length === 0 && <div className="text-sm text-white/60">Ninguém online agora.</div>}
            {online.map((u) => (
              <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2 hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    <img src={`/avatars/${(u.avatarKey || "avatar1")}.svg`} alt="avatar" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{u.username}</div>
                    <div className="text-xs text-white/55">{u.role}</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-300/80">online</div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
