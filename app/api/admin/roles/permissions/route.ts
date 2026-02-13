import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  roleId: z.string().min(1),
  permissionIds: z.array(z.string().min(1)),
});

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  await prisma.rolePermission.deleteMany({ where: { roleId: parsed.data.roleId } });
  for (const pid of parsed.data.permissionIds) {
    await prisma.rolePermission.create({ data: { roleId: parsed.data.roleId, permissionId: pid } }).catch(() => {});
  }

  await audit("admin.role.setPermissions", "Role", parsed.data.roleId, { actor: actor.id, permissionIds: parsed.data.permissionIds });
  return NextResponse.json({ ok: true });
}
