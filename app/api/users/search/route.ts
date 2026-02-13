import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

// Busca simples de usuários para autocomplete de @usuario (chats, etc.)
// - Não expõe e-mail
export async function GET(req: Request) {
  try {
    await requireUserApi();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (q.length < 2) return NextResponse.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        OR: [
          { username: { contains: q } },
        ],
      },
      select: { id: true, username: true, role: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
