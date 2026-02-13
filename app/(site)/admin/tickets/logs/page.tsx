import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function TicketLogsPage() {
  await requireRole("MODERATOR");

  const tickets = await prisma.ticket.findMany({
    where: { isDeleted: true },
    orderBy: { updatedAt: "desc" },
    include: {
      author: { select: { username: true } },
      assignedTo: { select: { username: true } },
      _count: { select: { messages: true } },
      ratings: { select: { stars: true, feedback: true, target: { select: { username: true } }, rater: { select: { username: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs de Tickets</h1>
        <p className="mt-1 text-sm text-white/55">Tickets apagados vão pra cá. Clique para abrir as mensagens (somente staff).</p>
      </div>

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/55">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-3">Atualizado</th>
              <th className="py-2 pr-3">Autor</th>
              <th className="py-2 pr-3">Título</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Mensagens</th>
              <th className="py-2 pr-3">Avaliação</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(t.updatedAt).toLocaleString("pt-BR")}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{t.author?.username ?? "—"}</td>
                <td className="py-2 pr-3">
                  <Link className="underline text-white/85 hover:text-white" href={`/admin/tickets/logs/${t.id}`}>
                    {t.title}
                  </Link>
                </td>
                <td className="py-2 pr-3"><Badge>{t.status}</Badge></td>
                <td className="py-2 pr-3 whitespace-nowrap">{t._count.messages}</td>
                <td className="py-2 pr-3">
                  {(() => {
                    const rs = (t as any).ratings ?? [];
                    if (!rs.length) return <span className="text-white/35">—</span>;
                    const avg = rs.reduce((a: number, r: any) => a + (r.stars ?? 0), 0) / rs.length;
                    return (
                      <div className="text-xs text-white/70">
                        <div className="text-white/85">{avg.toFixed(1)}★ <span className="text-white/45">({rs.length})</span></div>
                        <div className="mt-1 text-white/45 line-clamp-1">{rs[0]?.target?.username ? `para ${rs[0].target.username}` : ""}</div>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-white/55">Nenhum ticket apagado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
