import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canManageUser } from "@/lib/rbac";

const schema = z.object({
  id: z.string().min(1),
  until: z.string().nullable(), // ISO ou null
});

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  if (!canManageUser(actor as any, target as any)) {
    return NextResponse.json({ message: "Você não pode gerenciar um usuário com cargo igual/maior que o seu." }, { status: 403 });
  }

  const until = parsed.data.until ? new Date(parsed.data.until) : null;
  await prisma.user.update({ where: { id: parsed.data.id }, data: { bannedUntil: until } });
  await audit("admin.user.ban", "User", parsed.data.id, { actor: actor.id, until: parsed.data.until });
  return NextResponse.json({ ok: true });
}
