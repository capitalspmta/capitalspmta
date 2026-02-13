import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { canManageUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const actor = await requireRole("MODERATOR");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true, username: true } });
    if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    if (!canManageUser(actor as any, target as any)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    const openShift = await prisma.staffShift.findFirst({
      where: { userId: target.id, closedAt: null },
      orderBy: { openedAt: "desc" },
    });
    if (!openShift) return NextResponse.json({ message: "Não há ponto aberto para este staff." }, { status: 400 });

    const now = new Date();
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(openShift.openedAt).getTime()) / 1000));

    await prisma.staffShift.update({
      where: { id: openShift.id },
      data: { closedAt: now, seconds },
    });

    await audit("staff.timeclock.forceClose", "StaffShift", openShift.id, { actor: actor.id, targetId: target.id, seconds }).catch(() => null);
    await prisma.notification.create({ data: { userId, message: "Seu ponto foi fechado por " + me.username, href: "/admin/staff" } }).catch(() => null);
  return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
