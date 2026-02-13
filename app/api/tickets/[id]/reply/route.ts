import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({ content: z.string().min(1).max(20000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUserApi();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Mensagem inválida." }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });

const canSeeAll = hasAtLeast(user as any, "SUPPORT" as any);

    if (!canSeeAll) {
      const participant = await prisma.ticketParticipant.findUnique({
        where: { ticketId_userId: { ticketId: ticket.id, userId: user.id } },
      });
      if (!participant) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
    }

    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: user.id, content: parsed.data.content },
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date(), status: canSeeAll ? "WAITING" : "OPEN" },
    });

    await audit("ticket.reply", "Ticket", ticket.id, { by: user.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
