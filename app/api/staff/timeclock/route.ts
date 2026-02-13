import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
import { requireRole } from "@/lib/auth";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfWeek(d: Date) {
  // Monday 00:00 (local)
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
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

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function weekdayLabel(i: number) {
  // 0..6 from Monday
  return ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i] ?? "";
}

function splitByDay(start: Date, end: Date) {
  const parts: Array<{ dateKey: string; seconds: number }> = [];
  let cur = new Date(start);
  while (cur.getTime() < end.getTime()) {
    const next = new Date(cur);
    next.setHours(24, 0, 0, 0);
    const seg = clampInterval(cur, end, cur, next);
    if (!seg) break;
    const sec = Math.floor((seg[1].getTime() - seg[0].getTime()) / 1000);
    parts.push({ dateKey: ymd(seg[0]), seconds: sec });
    cur = next;
  }
  return parts;
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

    let effective = overlapSec;

    // seconds é usado como:
    // - shift ABERTO: ajuste manual acumulado (offset)
    // - shift FECHADO: total consolidado (duração + ajustes)
    const storedSeconds = Number.isFinite(s.seconds) ? Number(s.seconds) : 0;

    if (!s.closedAt) {
      // aberto: soma o offset (não podemos ratear por período com precisão)
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

async function computeWeekBreakdown(weekStart: Date, now: Date) {
  const shifts = await prisma.staffShift.findMany({
    where: { openedAt: { lt: now }, OR: [{ closedAt: null }, { closedAt: { gt: weekStart } }] },
    select: { userId: true, openedAt: true, closedAt: true, seconds: true },
  });

  const perUser = new Map<string, Record<string, number>>();
  for (const s of shifts as any[]) {
    const end = s.closedAt ? new Date(s.closedAt) : now;
    const start = new Date(s.openedAt);
    const seg = clampInterval(start, end, weekStart, now);
    if (!seg) continue;

    const parts = splitByDay(seg[0], seg[1]);

    // aplica ajuste manual no primeiro/último dia para refletir no ranking
    const storedSeconds = Number.isFinite(s.seconds) ? Number(s.seconds) : 0;
    if (parts.length) {
      if (!s.closedAt) {
        // shift aberto: seconds = offset
        parts[parts.length - 1].seconds += storedSeconds;
      } else {
        const fullSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
        const adjustment = storedSeconds - fullSec;
        parts[0].seconds += adjustment;
      }
    }

    for (const p of parts) {
      const obj = perUser.get(s.userId) || {};
      obj[p.dateKey] = (obj[p.dateKey] || 0) + p.seconds;
      perUser.set(s.userId, obj);
    }
  }

  // Build week columns (Mon..Sun)
  const days: Array<{ dateKey: string; label: string }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push({ dateKey: ymd(d), label: weekdayLabel(i) });
  }

  return { days, perUser };
}

export async function GET(req: Request) {
  try {
    const me = await requireRole("SUPPORT");
    const now = new Date();
    const url = new URL(req.url);
    const range = (url.searchParams.get("range") === "day" ? "day" : "week") as "day" | "week";

    const current = await prisma.staffShift.findFirst({ where: { userId: me.id, closedAt: null }, orderBy: { openedAt: "desc" } });

    const openShifts = await prisma.staffShift.findMany({
      where: { closedAt: null },
      orderBy: { openedAt: "asc" },
      take: 100,
      select: {
        id: true,
        openedAt: true,
        user: { select: { id: true, username: true, role: true } },
      },
    });

    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    // totals
    const dayTotals = await computeRangeTotals(dayStart, now);
    const weekTotals = await computeRangeTotals(weekStart, now);

    const daySeconds = dayTotals.get(me.id) || 0;
    const weekSeconds = weekTotals.get(me.id) || 0;

    // ranking based on selected range
    const totals = range === "day" ? dayTotals : weekTotals;
    const ids = Array.from(totals.keys());
    let ranking: Array<{ userId: string; username: string; role: string; seconds: number }> = [];
    if (ids.length) {
      const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, role: true } });
      ranking = users.map((u) => ({ userId: u.id, username: u.username, role: u.role, seconds: totals.get(u.id) || 0 }));
      ranking.sort((a, b) => b.seconds - a.seconds);
      ranking = ranking.slice(0, 50);
    }

    // weekly breakdown table (for ranking users)
    const breakdown = await computeWeekBreakdown(weekStart, now);
    const weekDaily = ranking.map((r) => {
      const obj = breakdown.perUser.get(r.userId) || {};
      const byDay = breakdown.days.map((d) => ({ dateKey: d.dateKey, label: d.label, seconds: obj[d.dateKey] || 0 }));
      const total = byDay.reduce((acc, x) => acc + x.seconds, 0);
      return { userId: r.userId, username: r.username, role: r.role, totalSeconds: total, byDay };
    });

    return NextResponse.json({
      me: { id: me.id, username: me.username, role: me.role },
      // compat com front
      shift: current,
      daySeconds,
      weekSeconds,
      ranking,
      openShifts,
      weekDays: breakdown.days,
      weekDaily,
    });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}

export async function POST() {
  return NextResponse.json({ message: "Use /open ou /close" }, { status: 400 });
}
