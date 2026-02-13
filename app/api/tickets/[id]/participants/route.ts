import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const addSchema = z.object({
  usernameOrEmail: z.string().min(2).max(120),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    const isStaff = hasAtLeast(actor as any, "SUPPORT");
    if (!isStaff) return NextResponse.json({ message: "Somente staff pode adicionar participantes." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });

    const needle = parsed.data.usernameOrEmail.trim();
    const target = await prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { username: { equals: needle } },
          { email: { equals: needle } },
        ],
      },
      select: { id: true, username: true },
    });
    if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

    await prisma.ticketParticipant.upsert({
      where: { ticketId_userId: { ticketId: params.id, userId: target.id } },
      update: {},
      create: { ticketId: params.id, userId: target.id, addedById: actor.id },
    });

    await audit("ticket.participant.add", "Ticket", params.id, { by: actor.id, user: target.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}

const delSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUserApi();
    const isStaff = hasAtLeast(actor as any, "SUPPORT");
    if (!isStaff) return NextResponse.json({ message: "Somente staff pode remover participantes." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = delSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    // nunca remove o autor
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, select: { authorId: true } });
    if (!ticket) return NextResponse.json({ message: "Ticket não encontrado." }, { status: 404 });
    if (parsed.data.userId === ticket.authorId) return NextResponse.json({ message: "Não é possível remover o autor." }, { status: 400 });

    await prisma.ticketParticipant.delete({ where: { ticketId_userId: { ticketId: params.id, userId: parsed.data.userId } } }).catch(() => null);
    await audit("ticket.participant.remove", "Ticket", params.id, { by: actor.id, user: parsed.data.userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
