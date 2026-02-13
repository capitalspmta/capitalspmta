import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const me = await requireRole("OWNER");
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email && !password) {
      return NextResponse.json({ message: "Informe email e/ou senha." }, { status: 400 });
    }

    const data: any = {};
    if (email) data.email = email.toLowerCase();
    if (password) {
      if (password.length < 6) return NextResponse.json({ message: "Senha muito curta (mín 6)." }, { status: 400 });
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json({ message: "Falha ao atualizar usuário." }, { status: 500 });
  }
}
