import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const actor = await requireUserApi();
    if (!hasAtLeast(actor as any, "SUPPORT" as any)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          // "mode: insensitive" pode falhar dependendo do provider/engine.
          // Para manter compatibilidade (SQLite/Postgres/etc), usamos busca simples.
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, username: true, role: true, email: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
