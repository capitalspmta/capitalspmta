import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, username: true, role: true, createdAt: true, points: true, bannedUntil: true, whitelistStatus: true },
      take: 200,
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
