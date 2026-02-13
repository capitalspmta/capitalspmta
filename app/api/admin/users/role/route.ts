import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
  role: z.enum(["USER", "SUPPORT", "MODERATOR", "ADMIN", "OWNER"]),
});

export async function POST(req: Request) {
  try {
    const actor = await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, role: true } });
    if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

    const actorRole = actor.role;
    const newRole = parsed.data.role;
    const targetRole = target.role;

    // Regras solicitadas:
    // - ADMIN pode mexer em ADMIN (gerenciar usuário), mas NÃO pode conceder ADMIN.
    // - ADMIN nunca pode promover para OWNER.
    // - OWNER pode conceder OWNER.
    // - Ninguém abaixo de OWNER mexe em OWNER.
    if (actorRole !== "OWNER") {
      if (targetRole === "OWNER") {
        return NextResponse.json({ message: "Somente OWNER pode alterar um OWNER." }, { status: 403 });
      }
      if (newRole === "OWNER") {
        return NextResponse.json({ message: "Somente OWNER pode conceder OWNER." }, { status: 403 });
      }
      if (newRole === "ADMIN" && targetRole !== "ADMIN") {
        return NextResponse.json({ message: "ADMIN não pode conceder ADMIN." }, { status: 403 });
      }
    }

    await prisma.user.update({ where: { id: parsed.data.id }, data: { role: newRole } });

    await audit("admin.user.setRole", "User", parsed.data.id, { role: parsed.data.role, actor: actor.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
