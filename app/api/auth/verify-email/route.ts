import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any;
  const code = String(body?.code ?? body?.token ?? "").trim();
  if (!code) return NextResponse.json({ message: "Código inválido." }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: code, emailVerifyExpiresAt: { gt: new Date() }, isDeleted: false },
    select: { id: true },
  });

  if (!user) return NextResponse.json({ message: "Código inválido ou expirado." }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpiresAt: null },
  });

  await audit("auth.verify_email", "User", user.id, {});
  return NextResponse.json({ ok: true });
}
