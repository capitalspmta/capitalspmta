import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ensureUserHasRole } from "@/lib/vip";

function getWeekKey(d = new Date()) {
  // ISO week key: YYYY-Www
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const actor = await requireRole("MODERATOR");
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action === "run_weekly") {
    const weekKey = getWeekKey(new Date());

    const totals = await prisma.staffShift.groupBy({
      by: ["userId"],
      _sum: { seconds: true },
      where: { closedAt: { not: null } },
    });

    const sorted = totals
      .map(t => ({ userId: t.userId, seconds: t._sum.seconds ?? 0 }))
      .sort((a, b) => b.seconds - a.seconds);

    const winners = sorted.slice(0, 3);

    for (let i = 0; i < winners.length; i++) {
      const userId = winners[i].userId;
      const exists = await prisma.staffWeeklyReward.findFirst({ where: { userId, weekKey } });
      if (exists) continue;

      await prisma.staffWeeklyReward.create({ data: { userId, position: i + 1, weekKey } });

      // recompensa: Staff Semanal + Apoiador +100 pontos por 7 dias
      await ensureUserHasRole(userId, "STAFF_SEMANAL");
      await ensureUserHasRole(userId, "APOIADOR");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.entitlement.createMany({
        data: [
          { userId, roleName: "STAFF_SEMANAL", expiresAt, source: `weekly:${weekKey}` },
          { userId, roleName: "APOIADOR", expiresAt, source: `weekly:${weekKey}` },
        ],
        skipDuplicates: true,
      });

      await prisma.user.update({ where: { id: userId }, data: { points: { increment: 100 } } });
    }

    await audit("staff.weekly.run", "StaffWeekly", weekKey, { weekKey });
    return NextResponse.json({ ok: true, weekKey, winners });
  }

  return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
}
