import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mailer";

const schema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras/números/_"),
  email: z.string().email(),
  password: z.string().min(8),
  confirm: z.string().min(8),
  accepted: z.boolean(),
  phone: z.string().min(7).max(20).optional(),
  recoveryEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const { username, email, password, confirm, accepted, phone, recoveryEmail } = parsed.data;
  if (!accepted) return NextResponse.json({ message: "Aceite os termos." }, { status: 400 });
  if (password !== confirm) return NextResponse.json({ message: "As senhas não conferem." }, { status: 400 });

    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) return NextResponse.json({ message: "Usuário/e-mail já existe." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);

  // Código de verificação por e-mail (6 dígitos) — em produção, envie por SMTP.
  // Aqui salvamos o código em texto puro (dev). Se quiser, podemos salvar hash depois.
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expires = new Date(Date.now() + 1000 * 60 * 15); // 15 min

    const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      phone: phone ?? null,
      recoveryEmail: recoveryEmail ?? null,
      whitelistStatus: "PENDING",
      emailVerifiedAt: null,
      emailVerifyToken: code,
      emailVerifyExpiresAt: expires,
    },
    select: { id: true, email: true, username: true, role: true, whitelistStatus: true },
  });

    await audit("auth.register", "User", user.id, { username });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get("origin") || "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email`;

    const sent = await sendMail({
      to: email,
      subject: "Confirme seu e-mail",
      html: `<p>Seu código de verificação é:</p><h2>${code}</h2><p>Este código expira em 15 minutos.</p><p>Abra: ${verifyUrl}</p>`,
      text: `Código: ${code} (expira em 15min). Abra: ${verifyUrl}`,
    }).catch(() => ({ ok: false } as any));

    // Se SMTP não estiver configurado, devolve o código apenas para ambiente de dev.
    const showCode = process.env.NODE_ENV !== "production" && !sent?.ok;
    return NextResponse.json({ ok: true, needsVerify: true, verifyUrl, ...(showCode ? { verifyCode: code } : {}) });
  } catch (e: any) {
    // Em local, devolvemos uma mensagem mais explícita para facilitar debug.
    const msg = String(e?.message || "Erro interno");
    return NextResponse.json({ message: "Falha ao criar conta.", detail: msg }, { status: 500 });
  }
}
