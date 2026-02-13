import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

// Considera "online" quem fez request recentemente (lastSeenAt).
// Ajuste o intervalo se quiser.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    await requireRole("SUPPORT");
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);

    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        lastSeenAt: { gte: since },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
      select: { id: true, username: true, role: true, lastSeenAt: true },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
