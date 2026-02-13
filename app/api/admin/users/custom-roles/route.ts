import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ message: "Id inválido." }, { status: 400 });

  const roles = await prisma.userRole.findMany({
    where: { userId: id },
    include: { role: { select: { id: true, name: true, rank: true } } },
    orderBy: { role: { rank: "desc" } },
  });

  return NextResponse.json(roles.map(r => r.role));
}

const schema = z.object({
  userId: z.string().min(1),
  roleIds: z.array(z.string().min(1)).max(50),
});

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const userId = parsed.data.userId;

  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { userId } });
    for (const roleId of parsed.data.roleIds) {
      await tx.userRole.create({ data: { userId, roleId } });
    }
  });

  await audit("admin.user.customRoles", "User", userId, { actor: actor.id, roleIds: parsed.data.roleIds });
  return NextResponse.json({ ok: true });
}
