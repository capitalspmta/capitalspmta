import { requireActiveUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { hasAtLeast } from "@/lib/rbac";
import { Card, Badge } from "@/components/ui";
import UserHoverLink from "@/components/UserHoverLink";
import TicketReply from "./reply";
import ParticipantsPanel from "./participants-panel";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const user = await requireActiveUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      author: { select: { id: true, username: true } },
      assignedTo: { select: { id: true, username: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, username: true, role: true } } } },
      participants: { include: { user: { select: { id: true, username: true, role: true, email: true } } } },
    },
  });

  if (!ticket) return <div className="text-white/70">Ticket não encontrado.</div>;
  if ((ticket as any).isDeleted) return <div className="text-white/70">Ticket removido.</div>;

  const canSeeAll = hasAtLeast(user as any, "SUPPORT" as any);
  const canModerate = hasAtLeast(user as any, "MODERATOR" as any);
  const canAdmin = hasAtLeast(user as any, "ADMIN" as any);

  if (!canSeeAll) {
    const isParticipant = ticket.participants?.some((p: any) => p.userId === user.id);
    if (!isParticipant) return <div className="text-white/70">Sem permissão.</div>;
  }

  const canClose = canAdmin;

  const pendingRatings = await prisma.ticketRatingRequirement.findMany({
    where: { ticketId: ticket.id, raterId: user.id, completed: false },
    include: { target: { select: { id: true, username: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  const participants = ticket.participants.map((p: any) => p.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/55">
          <Badge>{ticket.category.name}</Badge>
          <Badge>{ticket.status}</Badge>
          <Badge>{ticket.priority}</Badge>
          {ticket.assignedTo ? <Badge>Atendido por {ticket.assignedTo.username}</Badge> : <Badge>Não atribuído</Badge>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          
          {pendingRatings.length > 0 && (
            <a
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/15"
              href={`/tickets/${ticket.id}/close`}
            >
              Avaliar atendimento ({pendingRatings.length})
            </a>
          )}

          {canClose && ticket.status !== "CLOSED" && (
            <form action={`/api/admin/tickets/${ticket.id}/close-init`} method="post">
              <button
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                type="submit"
              >
                Fechar ticket (criar avaliações)
              </button>
            </form>
          )}

          {canAdmin && ticket.status === "CLOSED" && (
            <form action={`/api/admin/tickets/${ticket.id}/delete`} method="post">
              <button className="text-sm underline text-red-200 hover:text-red-100">Apagar ticket (vai para logs)</button>
            </form>
          )}

          {canAdmin && ticket.status !== "CLOSED" && (
            <div className="text-xs text-white/45">
              Para apagar, primeiro feche o ticket (a avaliação é obrigatória).
            </div>
          )}
        </div>
      </div>

      <ParticipantsPanel ticketId={ticket.id} participants={participants} canManage={canSeeAll} />

      <Card className="p-5">
        <div className="space-y-5">
          {ticket.messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <UserHoverLink userId={m.author.id} username={m.author.username} className="font-semibold text-white/85" />{" "}
                  <span className="text-white/45">({m.author.role})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-white/45">{new Date(m.createdAt).toLocaleString("pt-BR")}</div>
                  {canModerate && !m.isDeleted && (
                    <form action={`/api/admin/tickets/messages/${m.id}/delete`} method="post">
                      <button className="text-xs underline text-white/50 hover:text-white/80">Apagar</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-white/75">{m.isDeleted ? "[mensagem removida]" : m.content}</div>
            </div>
          ))}
        </div>
      </Card>

      <TicketReply ticketId={ticket.id} />
    </div>
  );
}
