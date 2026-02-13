import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  try {
    const me = await requireRole("SUPPORT");
    const existing = await prisma.staffShift.findFirst({ where: { userId: me.id, closedAt: null } });
    if (existing) return NextResponse.json({ ok: true, currentShift: existing });

    const shift = await prisma.staffShift.create({ data: { userId: me.id, openedAt: new Date() } });
    await audit("staff.shift.open", "StaffShift", shift.id, { userId: me.id }).catch(() => null);
    return NextResponse.json({ ok: true, currentShift: shift });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
