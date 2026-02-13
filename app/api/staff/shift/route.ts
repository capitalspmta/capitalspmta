import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET() {
  await requireUserApi();
  const open = await prisma.staffShift.findMany({
    where: { closedAt: null },
    orderBy: { openedAt: "asc" },
    select: {
      id: true,
      openedAt: true,
      user: { select: { id: true, username: true, role: true } },
    },
  });
  return NextResponse.json(open);
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  const { action } = await req.json().catch(() => ({}));

  if (action === "open") {
    const existing = await prisma.staffShift.findFirst({
      where: { userId: user.id, closedAt: null },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ message: "Ponto já aberto." }, { status: 400 });

    const shift = await prisma.staffShift.create({
      data: { userId: user.id, openedAt: new Date() },
      select: { id: true, openedAt: true },
    });
    await audit("staff.shift.open", "StaffShift", shift.id, { shiftId: shift.id });
    return NextResponse.json({ ok: true, shift });
  }

  if (action === "close") {
    const shift = await prisma.staffShift.findFirst({
      where: { userId: user.id, closedAt: null },
    });
    if (!shift) return NextResponse.json({ message: "Nenhum ponto aberto." }, { status: 400 });

    const now = new Date();
    const seconds = Math.max(0, Math.floor((now.getTime() - shift.openedAt.getTime()) / 1000));

    const updated = await prisma.staffShift.update({
      where: { id: shift.id },
      data: { closedAt: now, seconds },
      select: { id: true, openedAt: true, closedAt: true, seconds: true },
    });
    await audit("staff.shift.close", "StaffShift", updated.id, { shiftId: updated.id, seconds: updated.seconds });
    return NextResponse.json({ ok: true, shift: updated });
  }

  return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
}
