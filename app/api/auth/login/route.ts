import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  emailOrUser: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const { emailOrUser, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUser.toLowerCase() }, { username: emailOrUser }],
    },
    select: { id: true, email: true, username: true, role: true, whitelistStatus: true, emailVerifiedAt: true, passwordHash: true },
  });

  if (!user) return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ message: "Credenciais inválidas." }, { status: 401 });

  if (!user.emailVerifiedAt) {
    return NextResponse.json({ message: "Verifique seu e-mail antes de entrar." }, { status: 403 });
  }

  const safe = { id: user.id, email: user.email, username: user.username, role: user.role, whitelistStatus: user.whitelistStatus ?? "PENDING" };
  await createSessionCookie(safe);
  await audit("auth.login", "User", user.id);

  return NextResponse.json({ ok: true, redirect: user.whitelistStatus === "APPROVED" ? "/forum" : "/whitelist" });
}
