import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).max(40).optional(),
  rank: z.number().int().min(1).max(99).optional(),
  description: z.string().max(120).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const role = await prisma.role.update({ where: { id: params.id }, data: parsed.data, select: { id: true, name: true, rank: true } });
  await audit("admin.role.update", "Role", role.id, { name: role.name, rank: role.rank });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");
  // não permitir deletar cargos base do sistema
  const role = await prisma.role.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!role) return NextResponse.json({ message: "Cargo não encontrado." }, { status: 404 });

  const protectedNames = ["OWNER", "ADMIN", "MODERATOR", "SUPPORT", "USER"];
  if (protectedNames.includes(role.name)) {
    return NextResponse.json({ message: "Este cargo é protegido e não pode ser removido." }, { status: 400 });
  }

  await prisma.role.delete({ where: { id: params.id } });
  await audit("admin.role.delete", "Role", role.id, { name: role.name });
  return NextResponse.json({ ok: true });
}
