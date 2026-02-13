import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST() {
  try {
    const actor = await requireRole("ADMIN");
    await prisma.staffShift.deleteMany();
    await audit("staff.shift.reset.all", "StaffShift", null, { actor: actor.id }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
