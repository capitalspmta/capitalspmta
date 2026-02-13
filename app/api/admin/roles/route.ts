import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("ADMIN");
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, rank: true, description: true, colorHex: true },
    orderBy: { rank: "desc" },
  });
  return NextResponse.json({ roles });
}

const SYSTEM_ROLES = [
  { name: "USER", rank: 1, description: "Usuário comum" },
  { name: "SUPPORT", rank: 2, description: "Staff - suporte" },
  { name: "MODERATOR", rank: 3, description: "Staff - moderador" },
  { name: "ADMIN", rank: 4, description: "Staff - administrador" },
  { name: "OWNER", rank: 5, description: "Dono" },
] as const;

const createSchema = z.object({
  systemRole: z.enum(["USER", "SUPPORT", "MODERATOR", "ADMIN", "OWNER"]),
});

const createCustomSchema = z.object({
  name: z.string().min(2).max(32),
  rank: z.number().int().min(1).max(999).optional(),
  description: z.string().max(140).optional().nullable(),
  colorHex: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional().nullable(),
});

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);

  // 1) cargos do sistema
  const parsedSystem = createSchema.safeParse(body);
  if (parsedSystem.success) {
    const def = SYSTEM_ROLES.find((r) => r.name === parsedSystem.data.systemRole)!;
    const exists = await prisma.role.findUnique({ where: { name: def.name } });
    if (exists) return NextResponse.json({ ok: true, role: exists });
    const role = await prisma.role.create({
      data: { name: def.name, rank: def.rank, description: def.description },
    });
    await audit("admin.role.create", "Role", role.id, { actor: actor.id, name: role.name }).catch(() => null);
    return NextResponse.json({ ok: true, role });
  }

  // 2) cargo customizado (VIP/SHOP/FORUM/etc.)
  const parsedCustom = createCustomSchema.safeParse(body);
  if (!parsedCustom.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const name = parsedCustom.data.name.trim().toUpperCase();
  const exists = await prisma.role.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ ok: true, role: exists });

  const role = await prisma.role.create({
    data: {
      name,
      rank: parsedCustom.data.rank ?? 1,
      description: parsedCustom.data.description ?? null,
      colorHex: parsedCustom.data.colorHex ? (parsedCustom.data.colorHex.startsWith("#") ? parsedCustom.data.colorHex : `#${parsedCustom.data.colorHex}`) : null,
    },
  });
  await audit("admin.role.create_custom", "Role", role.id, { actor: actor.id, name: role.name }).catch(() => null);
  return NextResponse.json({ ok: true, role });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  // não deletar cargos base críticos
  const base = new Set(["SUPPORT", "MODERATOR", "ADMIN", "OWNER", "USER", "APOIADOR", "INVESTIDOR", "PATROCINADOR"]);
  const r = await prisma.role.findUnique({ where: { id: parsed.data.id }, select: { id: true, name: true } });
  if (!r) return NextResponse.json({ message: "Cargo não encontrado." }, { status: 404 });
  if (base.has(r.name)) return NextResponse.json({ message: "Esse cargo é protegido." }, { status: 400 });

  await prisma.role.delete({ where: { id: r.id } });
  await audit("admin.role.delete", "Role", r.id, { actor: actor.id, name: r.name }).catch(() => null);
  return NextResponse.json({ ok: true });
}
