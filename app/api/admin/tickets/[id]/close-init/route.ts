import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

// Inicia o fechamento: cria requisitos de avaliação (somente o autor -> staffs envolvidos)
// e move o ticket para RESOLVED. Somente ADMIN/OWNER.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    if (!hasAtLeast(actor as any, "ADMIN" as any)) {
      return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        messages: { select: { authorId: true } },
      },
    });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });
    if (ticket.isDeleted) return NextResponse.json({ message: "Ticket removido." }, { status: 400 });
    if (ticket.status === "CLOSED") return NextResponse.json({ message: "Ticket já está fechado." }, { status: 400 });

    // Staffs envolvidos: assignee + autores de mensagem staff
    const uniqueAuthors = Array.from(new Set(ticket.messages.map(m => m.authorId)));
    const candidateIds = Array.from(new Set([...(ticket.assignedToId ? [ticket.assignedToId] : []), ...uniqueAuthors]));

    const staffUsers = await prisma.user.findMany({
      where: { id: { in: candidateIds }, role: { in: ["SUPPORT","MODERATOR","ADMIN","OWNER"] } },
      select: { id: true },
    });
    const staffIds = staffUsers.map(u => u.id).filter(id => id !== ticket.authorId);

    // Requisitos idempotentes: somente o autor avalia os staffs.
    for (const sid of staffIds) {
      await prisma.ticketRatingRequirement.upsert({
        where: { ticketId_raterId_targetId: { ticketId: ticket.id, raterId: ticket.authorId, targetId: sid } },
        update: {},
        create: { ticketId: ticket.id, raterId: ticket.authorId, targetId: sid },
      });
    }

    if (ticket.status !== "RESOLVED") {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });
    }

    // Notificações (melhor esforço)
    const msg = `O ticket #${ticket.id.slice(0, 6)} está aguardando sua avaliação para encerrar.`;
    await prisma.notification.create({ data: { userId: ticket.authorId, message: msg, href: `/tickets/${ticket.id}/close` } }).catch(() => {});

    await audit("ticket.close.init", "Ticket", ticket.id, { by: actor.id, staffCount: staffIds.length });

    // Redirect de volta para o ticket
    const url = new URL(`/tickets/${ticket.id}?close=started`, req.url);
    return NextResponse.redirect(url);
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
