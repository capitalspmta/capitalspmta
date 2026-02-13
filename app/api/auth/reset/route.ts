
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  password: z.string().min(8),
  confirm: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const { email, code, password, confirm } = parsed.data;
  if (password !== confirm) return NextResponse.json({ message: "Confirmação não confere." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  if (!user) return NextResponse.json({ message: "Código inválido." }, { status: 400 });

  const token = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, code, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return NextResponse.json({ message: "Código inválido ou expirado." }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  await prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

  await audit("auth.password.reset", "User", user.id, {});
  return NextResponse.json({ ok: true });
}
