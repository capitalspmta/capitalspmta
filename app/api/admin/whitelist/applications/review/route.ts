import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  const actor = await requireRole("SUPPORT");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const app = await prisma.whitelistApplication.findUnique({ where: { id: parsed.data.id } });
  if (!app) return NextResponse.json({ message: "Whitelist não encontrada." }, { status: 404 });

  if (parsed.data.action === "APPROVE") {
    await prisma.whitelistApplication.update({
      where: { id: parsed.data.id },
      data: { status: "APPROVED", reviewerId: actor.id, reviewedAt: new Date(), rejectReason: null },
    });
    await prisma.user.update({ where: { id: app.userId }, data: { whitelistStatus: "APPROVED" } });
    await prisma.notification.create({ data: { userId: app.userId, message: "✅ Sua whitelist foi **APROVADA**. Você já pode entrar no servidor.", href: "/whitelist" } }).catch(() => null);
    await audit("whitelist.approve", "WhitelistApplication", parsed.data.id, { actor: actor.id });
  } else {
    const reason = parsed.data.reason?.trim();
    if (!reason) return NextResponse.json({ message: "Informe o motivo da reprova." }, { status: 400 });
    await prisma.whitelistApplication.update({
      where: { id: parsed.data.id },
      data: { status: "REJECTED", reviewerId: actor.id, reviewedAt: new Date(), rejectReason: reason },
    });
    await prisma.user.update({ where: { id: app.userId }, data: { whitelistStatus: "REJECTED" } });
    await prisma.notification.create({ data: { userId: app.userId, message: `❌ Sua whitelist foi **REPROVADA**. Motivo: ${reason}`, href: "/whitelist" } }).catch(() => null);
    await audit("whitelist.reject", "WhitelistApplication", parsed.data.id, { actor: actor.id, reason });
  }

  return NextResponse.json({ ok: true });
}
