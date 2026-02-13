import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  enabled: z.boolean(),
  pausedUntil: z.string().nullable().optional(),
  successTitle: z.string().min(1).max(80).optional(),
  successBody: z.string().min(1).max(300).optional(),
});

export async function POST(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const pausedUntil = parsed.data.pausedUntil ? new Date(parsed.data.pausedUntil) : null;

  await prisma.whitelistConfig.upsert({
    where: { id: "singleton" },
    update: {
      enabled: parsed.data.enabled,
      pausedUntil,
      successTitle: parsed.data.successTitle,
      successBody: parsed.data.successBody,
    },
    create: {
      id: "singleton",
      enabled: parsed.data.enabled,
      pausedUntil,
      successTitle: parsed.data.successTitle ?? "Whitelist aprovada!",
      successBody: parsed.data.successBody ?? "Bem-vindo(a)! Sua whitelist foi aprovada.",
    },
  });

  await audit("admin.whitelist.config.update", "WhitelistConfig", "singleton", { actor: actor.id });
  return NextResponse.json({ ok: true });
}
