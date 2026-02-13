
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Email inválido." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  // resposta neutra
  if (!user) return NextResponse.json({ ok: true });

  const code = genCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, code, expiresAt },
  });

  await audit("auth.password.forgot", "User", user.id, { expiresAt });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get("origin") || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset`;
  const sent = await sendMail({
    to: email,
    subject: "Recuperação de senha",
    html: `<p>Seu código de recuperação é:</p><h2>${code}</h2><p>Expira em 15 minutos.</p><p>Acesse: ${resetUrl}</p>`,
    text: `Código: ${code} (expira em 15min). Acesse: ${resetUrl}`,
  }).catch(() => ({ ok: false } as any));

  const showCode = process.env.NODE_ENV !== "production" && !sent?.ok;
  return NextResponse.json({ ok: true, ...(showCode ? { devCode: code } : {}) });
}
