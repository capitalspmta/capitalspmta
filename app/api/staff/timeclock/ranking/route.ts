import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

function startOfWeek(d: Date) {
  // Monday 00:00 (local)
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const s = new Date(d);
  s.setDate(d.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

function clampInterval(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): [Date, Date] | null {
  const s = new Date(Math.max(aStart.getTime(), bStart.getTime()));
  const e = new Date(Math.min(aEnd.getTime(), bEnd.getTime()));
  if (e.getTime() <= s.getTime()) return null;
  return [s, e];
}

async function computeRangeTotals(rangeStart: Date, rangeEnd: Date) {
  const shifts = await prisma.staffShift.findMany({
    where: { openedAt: { lt: rangeEnd }, OR: [{ closedAt: null }, { closedAt: { gt: rangeStart } }] },
    select: { userId: true, openedAt: true, closedAt: true, seconds: true },
  });

  const totals = new Map<string, number>();
  for (const s of shifts as any[]) {
    const start = new Date(s.openedAt);
    const end = s.closedAt ? new Date(s.closedAt) : rangeEnd;
    const seg = clampInterval(start, end, rangeStart, rangeEnd);
    if (!seg) continue;

    const overlapSec = Math.max(0, Math.floor((seg[1].getTime() - seg[0].getTime()) / 1000));

    // seconds é usado como:
    // - shift ABERTO: ajuste manual acumulado (offset)
    // - shift FECHADO: total consolidado (duração + ajustes)
    const storedSeconds = Number.isFinite(s.seconds) ? Number(s.seconds) : 0;

    let effective = overlapSec;
    if (!s.closedAt) {
      effective = overlapSec + storedSeconds;
    } else {
      const fullSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
      const adjustment = storedSeconds - fullSec;
      const scaledAdj = fullSec > 0 ? Math.round(adjustment * (overlapSec / fullSec)) : adjustment;
      effective = overlapSec + scaledAdj;
    }

    effective = Math.max(0, effective);
    totals.set(s.userId, (totals.get(s.userId) || 0) + effective);
  }
  return totals;
}

export async function POST() {
  try {
    await requireRole("SUPPORT");

    const now = new Date();
    const weekStart = startOfWeek(now);

    const weekTotals = await computeRangeTotals(weekStart, now);
    const ids = Array.from(weekTotals.keys());

    let ranking: Array<{ userId: string; username: string; role: string; seconds: number }> = [];
    if (ids.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, role: true },
      });

      ranking = users
        .map((u) => ({ userId: u.id, username: u.username, role: u.role, seconds: weekTotals.get(u.id) || 0 }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 50);
    }

    return NextResponse.json({ ranking });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
