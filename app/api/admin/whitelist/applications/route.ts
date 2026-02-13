import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireRole("SUPPORT");
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "PENDING").toUpperCase();

  if (status === "APPROVED_USERS") {
    const users = await prisma.user.findMany({
      where: { whitelistStatus: "APPROVED", isDeleted: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, username: true, email: true, role: true, lastSeenAt: true },
      take: 500,
    });
    return NextResponse.json({ users });
  }

  const apps = await prisma.whitelistApplication.findMany({
    where: { status: status as any },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
    take: 200,
  });
  return NextResponse.json({ apps });
}
