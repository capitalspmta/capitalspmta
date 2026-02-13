import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

const VIP_ROLES = ["APOIADOR", "INVESTIDOR", "PATROCINADOR"] as const;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const me = await requireUserApi();
  const userId = params.id;

  const now = new Date();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      points: true,
      lastSeenAt: true,
      userBadges: { select: { badge: { select: { id: true, name: true, icon: true } } } },
      entitlements: { where: { expiresAt: { gt: now } }, select: { roleName: true, expiresAt: true } },
    },
  });

  if (!u) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

  const vip = (u.entitlements || [])
    .filter((e: any) => (VIP_ROLES as any).includes(e.roleName))
    .sort((a: any, b: any) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0];

  const online = now.getTime() - new Date(u.lastSeenAt).getTime() <= 5 * 60 * 1000;

  return NextResponse.json({
    me: { id: me.id },
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      points: u.points,
      online,
      lastSeenAt: u.lastSeenAt,
      vip: vip ? { name: vip.roleName, expiresAt: vip.expiresAt } : null,
      badges: (u.userBadges || []).map((ub: any) => ub.badge),
    },
  });
}
