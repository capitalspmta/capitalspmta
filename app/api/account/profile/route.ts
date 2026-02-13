import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Use apenas letras/números/_").optional(),
  avatarKey: z.enum(["avatar1","avatar2","avatar3","avatar4","avatar5","avatar6"]).optional(),
  phone: z.string().min(8).max(32).optional(),
  recoveryEmail: z.string().email().max(120).optional(),
});

export async function POST(req: Request) {
  const user = await requireUserApi();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  if (parsed.data.username) {
    const exists = await prisma.user.findFirst({ where: { username: parsed.data.username, NOT: { id: user.id } } });
    if (exists) return NextResponse.json({ message: "Username já em uso." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(parsed.data.username ? { username: parsed.data.username } : {}),
      ...(parsed.data.avatarKey ? { avatarKey: parsed.data.avatarKey } : {}),
      ...(typeof parsed.data.phone !== "undefined" ? { phone: parsed.data.phone || null } : {}),
      ...(typeof parsed.data.recoveryEmail !== "undefined" ? { recoveryEmail: parsed.data.recoveryEmail || null } : {}),
    },
  });

  await audit("account.updateProfile", "User", user.id, { ...parsed.data });
  return NextResponse.json({ ok: true });
}