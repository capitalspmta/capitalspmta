import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { canManageUser } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => ({}));
  const { userId, type, reason, days } = body as { userId?: string; type?: "BAN" | "WARN"; reason?: string; days?: number };

  if (!userId || !type || !reason) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

  if (!canManageUser(actor, target)) return NextResponse.json({ message: "Sem permissão para agir neste usuário." }, { status: 403 });

  let expiresAt: Date | null = null;
  if (type === "BAN" && Number.isFinite(days) && days && days > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
  }

  const c = await prisma.adminCase.create({
    data: {
      targetUserId: userId,
      staffUserId: actor.id,
      type,
      reason,
      expiresAt,
      active: true,
    },
    select: { id: true },
  });

  // espelha ban ativo em User.bannedUntil para bloquear login/entrada
  if (type === "BAN") {
    await prisma.user.update({ where: { id: userId }, data: { bannedUntil: expiresAt ?? new Date("9999-12-31") } });
  }

  await audit(`admin.case.${type.toLowerCase()}`, "UserCase", c.id, { caseId: c.id, targetUserId: userId, reason, expiresAt });
  return NextResponse.json({ ok: true, id: c.id });
}

export async function GET() {
  await requireRole("ADMIN");
  const items = await prisma.adminCase.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      targetUser: { select: { id: true, username: true, email: true, role: true } },
      staffUser: { select: { id: true, username: true, email: true, role: true } },
    },
  });
  return NextResponse.json(items);
}
