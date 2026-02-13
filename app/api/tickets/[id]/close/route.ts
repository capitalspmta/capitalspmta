import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  ratings: z.array(z.object({
    targetUserId: z.string().min(1),
    stars: z.number().int().min(1).max(5),
    feedback: z.string().min(3).max(2000),
  })).default([]),
});

function penaltyForStars(stars: number) {
  if (stars <= 1) return 5;
  if (stars === 2) return 2;
  return 0;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        messages: { select: { authorId: true } },
        participants: { select: { userId: true } },
      },
    });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });
    if (ticket.isDeleted) return NextResponse.json({ message: "Ticket removido." }, { status: 400 });
    if (ticket.status === "CLOSED") return NextResponse.json({ message: "Ticket já está fechado." }, { status: 400 });

    const isAdmin = hasAtLeast(actor as any, "ADMIN" as any);
    const isAuthor = ticket.authorId === actor.id;
    const isParticipant = isAuthor || ticket.participants.some(p => p.userId === actor.id);
    if (!isParticipant && !isAdmin) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    // Somente ADMIN/OWNER pode iniciar o fechamento (criar requisitos + mover para RESOLVED).
    // Depois disso, somente o autor (player) envia avaliação do staff.
    if (ticket.status !== "RESOLVED" && !isAdmin) {
      return NextResponse.json({ message: "Somente ADMIN pode fechar o ticket." }, { status: 403 });
    }

    // Em RESOLVED: apenas o autor pode avaliar.
    if (ticket.status === "RESOLVED" && !isAuthor && !isAdmin) {
      return NextResponse.json({ message: "Somente o autor pode avaliar o atendimento." }, { status: 403 });
    }

    // Descobre staffs que falaram no ticket
    const uniqueAuthors = Array.from(new Set(ticket.messages.map(m => m.authorId)));
    const candidateIds = Array.from(new Set([...(ticket.assignedToId ? [ticket.assignedToId] : []), ...uniqueAuthors]));
    const staffUsers = await prisma.user.findMany({
      where: { id: { in: candidateIds }, role: { in: ["SUPPORT","MODERATOR","ADMIN","OWNER"] } },
      select: { id: true },
    });
    const staffIds = staffUsers.map(u => u.id).filter(id => id !== ticket.authorId);

    // Cria requisitos de avaliação (idempotente)
    // Autor deve avaliar todos os staffs que falaram
    for (const sid of staffIds) {
      await prisma.ticketRatingRequirement.upsert({
        where: { ticketId_raterId_targetId: { ticketId: ticket.id, raterId: ticket.authorId, targetId: sid } },
        update: {},
        create: { ticketId: ticket.id, raterId: ticket.authorId, targetId: sid },
      });
    }

    // Se ainda está OPEN/WAITING/RESOLVED, move para RESOLVED (aguardando avaliações) caso não esteja
    if (ticket.status !== "RESOLVED") {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
    }

    // Aplica ratings enviados pelo ator e marca requisitos como completos
    for (const r of parsed.data.ratings) {
      const reqRow = await prisma.ticketRatingRequirement.findUnique({
        where: { ticketId_raterId_targetId: { ticketId: ticket.id, raterId: actor.id, targetId: r.targetUserId } },
        select: { completed: true },
      });
      if (!reqRow) continue;

      // upsert rating
      const existing = await prisma.ticketRating.findUnique({
        where: { ticketId_raterUserId_targetUserId: { ticketId: ticket.id, raterUserId: actor.id, targetUserId: r.targetUserId } },
        select: { id: true },
      });

      if (!existing) {
        await prisma.ticketRating.create({ data: { ticketId: ticket.id, raterUserId: actor.id, targetUserId: r.targetUserId, stars: r.stars, feedback: r.feedback } });
        const pen = penaltyForStars(r.stars);
        if (pen > 0) {
          await prisma.user.update({ where: { id: r.targetUserId }, data: { points: { decrement: pen } } }).catch(() => {});
        }
      } else {
        await prisma.ticketRating.update({
          where: { ticketId_raterUserId_targetUserId: { ticketId: ticket.id, raterUserId: actor.id, targetUserId: r.targetUserId } },
          data: { stars: r.stars, feedback: r.feedback },
        });
      }

      if (!reqRow.completed) {
        await prisma.ticketRatingRequirement.update({
          where: { ticketId_raterId_targetId: { ticketId: ticket.id, raterId: actor.id, targetId: r.targetUserId } },
          data: { completed: true },
        });
      }
    }

    // Se todos requisitos concluídos, fechar ticket
    const remaining = await prisma.ticketRatingRequirement.count({ where: { ticketId: ticket.id, completed: false } });
    if (remaining === 0) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "CLOSED", closedAt: new Date(), closedById: actor.id },
      });
      await audit("ticket.close.final", "Ticket", ticket.id, { by: actor.id });
      return NextResponse.json({ ok: true, closed: true });
    }

    await audit("ticket.close.request", "Ticket", ticket.id, { by: actor.id, pending: remaining });
    return NextResponse.json({ ok: true, closed: false, pending: remaining });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
