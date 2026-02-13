import { requireActiveUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { hasAtLeast } from "@/lib/rbac";
import CloseTicketForm from "./close-form";

export default async function CloseTicketPage({ params }: { params: { id: string } }) {
  const user = await requireActiveUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      messages: { select: { authorId: true } },
      author: { select: { id: true, username: true } },
    },
  });
  if (!ticket) return <div className="text-white/70">Ticket não encontrado.</div>;
  if (ticket.isDeleted) return <div className="text-white/70">Ticket removido.</div>;
  if (ticket.status === "CLOSED") return <div className="text-white/70">Este ticket já está fechado.</div>;

  const isStaff = hasAtLeast(user as any, "SUPPORT" as any);
  const isAuthor = ticket.authorId === user.id;
  const canAccess = isStaff || isAuthor || (await prisma.ticketParticipant.findFirst({ where: { ticketId: ticket.id, userId: user.id } })) != null;
  if (!canAccess) return <div className="text-white/70">Sem permissão.</div>;

  const isAdmin = hasAtLeast(user as any, "ADMIN" as any);

  // Se o ticket ainda não entrou em RESOLVED, não existem requisitos ainda.
  // Somente ADMIN inicia o fechamento (cria requisitos + move para RESOLVED).
  if (ticket.status !== "RESOLVED" && isAdmin) {
    // Renderiza um CTA claro para iniciar o fechamento.
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fechar ticket</h1>
          <div className="mt-1 text-sm text-white/60">#{ticket.id.slice(0, 6)} • {ticket.title}</div>
          <div className="mt-2 text-sm text-white/50">
            Para encerrar, primeiro crie as avaliações obrigatórias (autor → staff). Depois o autor envia a avaliação.
          </div>
        </div>

        <form action={`/api/admin/tickets/${ticket.id}/close-init`} method="post" className="inline-block">
          <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90" type="submit">
            Iniciar fechamento (criar avaliações)
          </button>
        </form>

        <div className="text-xs text-white/40">
          Obs.: players e staffs só vão ver o botão de “Avaliar atendimento” quando tiver avaliações pendentes.
        </div>
      </div>
    );
  }

  // Somente o autor deve avaliar.
  if (ticket.status === "RESOLVED" && !isAuthor && !isAdmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Avaliação do ticket</h1>
        <div className="text-sm text-white/60">Você não tem avaliações pendentes neste ticket.</div>
      </div>
    );
  }

  const pending = await prisma.ticketRatingRequirement.findMany({
    where: { ticketId: ticket.id, raterId: user.id, completed: false },
    include: { target: { select: { id: true, username: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Avaliação do ticket</h1>
        <div className="mt-1 text-sm text-white/60">#{ticket.id.slice(0, 6)} • {ticket.title}</div>
        <div className="mt-2 text-sm text-white/50">
          Para encerrar definitivamente, o autor precisa enviar todas as avaliações pendentes.
        </div>
      </div>

      <CloseTicketForm ticketId={ticket.id} pendingTargets={pending.map(p => p.target)} />
    </div>
  );
}
