import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await requireRole("OWNER");
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, email: true, username: true } });
  if (!user) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json({ user });
}
