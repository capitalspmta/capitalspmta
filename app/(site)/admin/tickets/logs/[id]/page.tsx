import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function TicketLogDetail({ params }: { params: { id: string } }) {
  await requireRole("MODERATOR");

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      author: { select: { username: true } },
      assignedTo: { select: { username: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { username: true, role: true } } } },
      ratings: { orderBy: { createdAt: "desc" }, include: { rater: { select: { username: true } }, target: { select: { username: true } } } },
    },
  });

  if (!ticket || !ticket.isDeleted) {
    return <div className="text-white/70">Ticket não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-white/45">
        <Link href="/admin/tickets/logs" className="hover:text-white underline">Logs de Tickets</Link> / {ticket.id}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/55">
          <Badge>{ticket.category?.name ?? "—"}</Badge>
          <Badge>{ticket.status}</Badge>
          <span>• Autor: {ticket.author?.username ?? "—"}</span>
          {ticket.assignedTo ? <span>• Atendido por: {ticket.assignedTo.username}</span> : null}
        </div>
      </div>

      <Card className="p-5">
        <div className="space-y-4">
          {ticket.messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className="font-semibold text-white/85">{m.author.username}</span>{" "}
                  <span className="text-white/45">({m.author.role})</span>
                </div>
                <div className="text-xs text-white/45">{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-white/80">{m.content}</div>
            </div>
          ))}
          {ticket.messages.length === 0 && <div className="text-sm text-white/55">Sem mensagens.</div>}
        </div>
      </Card>
    </div>
  );
}
