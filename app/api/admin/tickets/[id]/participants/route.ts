import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const addSchema = z.object({ userId: z.string().min(1) });
const removeSchema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    if (!hasAtLeast(actor as any, "SUPPORT" as any)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });

    // garante que autor está como participante
    await prisma.ticketParticipant.upsert({
      where: { ticketId_userId: { ticketId: ticket.id, userId: ticket.authorId } },
      update: {},
      create: { ticketId: ticket.id, userId: ticket.authorId, addedById: actor.id },
    });

    await prisma.ticketParticipant.upsert({
      where: { ticketId_userId: { ticketId: ticket.id, userId: parsed.data.userId } },
      update: {},
      create: { ticketId: ticket.id, userId: parsed.data.userId, addedById: actor.id },
    });

    await audit("ticket.participant.add", "Ticket", ticket.id, { userId: parsed.data.userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    if (!hasAtLeast(actor as any, "SUPPORT" as any)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });

    if (parsed.data.userId === ticket.authorId) return NextResponse.json({ message: "Não é possível remover o autor." }, { status: 400 });

    await prisma.ticketParticipant.delete({ where: { ticketId_userId: { ticketId: ticket.id, userId: parsed.data.userId } } }).catch(() => null);

    await audit("ticket.participant.remove", "Ticket", ticket.id, { userId: parsed.data.userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
