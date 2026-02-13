import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  await requireRole("OWNER");
  const rows = await prisma.bankInfo.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}

const schema = z.object({
  label: z.string().min(2).max(60),
  pixKey: z.string().max(120).optional().nullable(),
  holderName: z.string().max(80).optional().nullable(),
  bankName: z.string().max(80).optional().nullable(),
  agency: z.string().max(30).optional().nullable(),
  accountNumber: z.string().max(40).optional().nullable(),
  notes: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const row = await prisma.bankInfo.create({ data: parsed.data, select: { id: true } });
  await audit("owner.bank.create", "BankInfo", row.id, { actor: actor.id });
  return NextResponse.json({ ok: true });
}

const delSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = delSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  await prisma.bankInfo.delete({ where: { id: parsed.data.id } });
  await audit("owner.bank.delete", "BankInfo", parsed.data.id, { actor: actor.id });
  return NextResponse.json({ ok: true });
}
