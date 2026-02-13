import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({
  userId: z.string().min(1),
  deltaSeconds: z.number().int(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireRole("MODERATOR");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const { userId, deltaSeconds } = parsed.data;
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

    // não deixar moderador mexer em cargo superior
    if (!hasAtLeast(actor as any, target.role as any)) {
      return NextResponse.json({ message: "Você não pode ajustar um cargo acima do seu." }, { status: 403 });
    }

    const current = await prisma.staffShift.findFirst({ where: { userId, closedAt: null }, orderBy: { openedAt: "desc" } });
    if (current) {
      await prisma.staffShift.update({ where: { id: (current as any).id }, data: { seconds: { increment: deltaSeconds } } });
      await audit("staff.shift.adjust", "StaffShift", (current as any).id, { actor: actor.id, userId, deltaSeconds }).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    // cria um shift fechado só pra acumular horas
    const fake = await prisma.staffShift.create({ data: { userId, openedAt: new Date(), closedAt: new Date(), seconds: deltaSeconds } });
    await audit("staff.shift.adjust.create", "StaffShift", fake.id, { actor: actor.id, userId, deltaSeconds }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
