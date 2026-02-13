import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ topics: [] });

    const topics = await prisma.topic.findMany({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: q } },
          { id: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { board: { select: { id: true, name: true } }, author: { select: { username: true } } },
    });

    return NextResponse.json({ topics });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
