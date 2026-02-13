import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ userId: z.string().min(1), reason: z.string().min(1).max(500).optional() });

export async function POST(req: Request) {
  await requireRole("MODERATOR");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  await prisma.user.update({ where: { id: parsed.data.userId }, data: { whitelistStatus: "REVOKED" } });
  await audit("whitelist.revoke", "User", parsed.data.userId, { reason: parsed.data.reason ?? null });

  return NextResponse.json({ ok: true });
}
