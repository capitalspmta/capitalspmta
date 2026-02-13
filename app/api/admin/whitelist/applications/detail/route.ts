import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireRole("SUPPORT");
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ message: "Id inválido." }, { status: 400 });

  const app = await prisma.whitelistApplication.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, role: true, whitelistStatus: true } },
      answers: { include: { question: { select: { id: true, prompt: true, required: true, order: true } } }, orderBy: { createdAt: "asc" } },
      reviewer: { select: { id: true, username: true } },
    },
  });

  if (!app) return NextResponse.json({ message: "Whitelist não encontrada." }, { status: 404 });
  return NextResponse.json(app);
}
