import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUserApi();
    const items = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      // O sininho deve mostrar todo o histórico (sem limite).
      select: { id: true, message: true, href: true, read: true, createdAt: true },
    });
    const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
    return NextResponse.json({ items, unread });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
