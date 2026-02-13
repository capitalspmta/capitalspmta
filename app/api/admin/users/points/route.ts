import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canManageUser } from "@/lib/rbac";

const schema = z.object({
  id: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const actor = await requireRole("MODERATOR");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  if (!canManageUser(actor as any, target as any)) {
    return NextResponse.json({ message: "Você não pode aplicar ações em um cargo igual/maior que o seu." }, { status: 403 });
  }

  const u = await prisma.user.update({
    where: { id: parsed.data.id },
    data: { points: { increment: parsed.data.delta } },
    select: { points: true },
  });

  await audit("admin.user.points", "User", parsed.data.id, { actor: actor.id, delta: parsed.data.delta, reason: parsed.data.reason, newPoints: u.points });
  return NextResponse.json({ ok: true, points: u.points });
}
