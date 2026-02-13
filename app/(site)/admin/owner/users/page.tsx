
import { requireActiveUser } from "@/lib/guards";
import { hasAtLeast } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function OwnerUsersPage() {
  const user = await requireActiveUser();
  if (!hasAtLeast(user as any, "OWNER" as any)) return <div className="text-white/70">Acesso negado.</div>;

  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { gameAccounts: true },
  });

  const spend = await prisma.purchase.groupBy({
    by: ["userId"],
    where: { status: "PAID" },
    _sum: { amountCents: true },
  });
  const spendMap = new Map(spend.map(s => [s.userId, s._sum.amountCents || 0]));

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Todas as contas</h1>
        <div className="text-xs text-white/45">Mostrando até 500 usuários</div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="text-left p-3">Usuário</th>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Serial MTA</th>
              <th className="text-left p-3">Gasto (R$)</th>
              <th className="text-left p-3">Pontos</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const serial = u.gameAccounts?.[0]?.mtaSerial || "-";
              const cents = Number(spendMap.get(u.id) ?? 0);
              const reais = (cents/100).toFixed(2).replace(".", ",");
              return (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="p-3">
                    <Link className="underline text-white/80 hover:text-white" href={`/profile/${u.id}`}>@{u.username}</Link>
                    <div className="text-xs text-white/45">{u.role}</div>
                  </td>
                  <td className="p-3 font-mono text-xs text-white/55">{u.id}</td>
                  <td className="p-3 text-white/70">{u.email}</td>
                  <td className="p-3 font-mono text-xs text-white/70">{serial}</td>
                  <td className="p-3 text-white/70">{reais}</td>
                  <td className="p-3 text-white/70">{u.points}</td>
                  <td className="p-3">
                    <Link className="underline text-white/80 hover:text-white" href={`/admin/owner/users/${u.id}`}>Editar</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
