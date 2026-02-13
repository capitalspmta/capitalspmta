import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  try {
    const me = await requireRole("SUPPORT");
    const now = new Date();
    const current = await prisma.staffShift.findFirst({ where: { userId: me.id, closedAt: null }, orderBy: { openedAt: "desc" } });
    if (!current) return NextResponse.json({ message: "Você não tem um ponto aberto." }, { status: 400 });

    const openedAt = new Date((current as any).openedAt);
    const extra = Math.max(0, Math.floor((now.getTime() - openedAt.getTime()) / 1000));

    const updated = await prisma.staffShift.update({
      where: { id: (current as any).id },
      data: { closedAt: now, seconds: { increment: extra } },
    });

    // Audit não pode quebrar fluxo do ponto
    await audit("staff.shift.close", "StaffShift", updated.id, { userId: me.id, secondsAdded: extra }).catch(() => null);
    return NextResponse.json({ ok: true, currentShift: updated });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
