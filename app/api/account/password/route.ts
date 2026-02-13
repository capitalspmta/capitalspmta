
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8),
  confirm: z.string().min(8),
});

export async function POST(req: Request) {
  const user = await requireUserApi();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  const { current, next, confirm } = parsed.data;
  if (next !== confirm) return NextResponse.json({ message: "A confirmação não confere." }, { status: 400 });

  const db = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!db) return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });

  const ok = await bcrypt.compare(current, db.passwordHash);
  if (!ok) return NextResponse.json({ message: "Senha atual incorreta." }, { status: 400 });

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  await audit("account.password.change", "User", user.id, {});
  return NextResponse.json({ ok: true });
}
