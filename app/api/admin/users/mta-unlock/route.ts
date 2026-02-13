import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canManageUser } from "@/lib/rbac";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  if (!canManageUser(actor as any, target as any)) {
    return NextResponse.json({ message: "Você não pode liberar serial de um cargo igual/maior que o seu." }, { status: 403 });
  }

  const acc = await prisma.gameAccount.findUnique({ where: { userId: parsed.data.userId } });
  if (!acc) return NextResponse.json({ message: "Usuário não possui vínculo MTA." }, { status: 404 });

  await prisma.gameAccount.update({ where: { userId: parsed.data.userId }, data: { locked: false } });

  await audit("admin.mta.unlock", "User", parsed.data.userId, { actor: actor.id });
  return NextResponse.json({ ok: true });
}
