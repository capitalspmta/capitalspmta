import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("OWNER");

  const coupons = await prisma.coupon.findMany({
    select: {
      id: true,
      code: true,
      percentOff: true,
      amountOffCents: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ coupons });
}

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, _ ou -"),
  percentOff: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const code = parsed.data.code.trim().toUpperCase();

  const exists = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
  if (exists) return NextResponse.json({ message: "Cupom já existe." }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: {
      code,
      percentOff: parsed.data.percentOff,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      percentOff: true,
      uses: true,
      maxUses: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  await audit("owner.coupon.create", "Coupon", coupon.id, { actor: actor.id, code: coupon.code, percentOff: coupon.percentOff }).catch(() => null);

  return NextResponse.json({ ok: true, coupon });
}

const patchSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export async function PATCH(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const coupon = await prisma.coupon.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
    select: {
      id: true,
      code: true,
      percentOff: true,
      uses: true,
      maxUses: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });

  await audit("owner.coupon.update", "Coupon", coupon.id, { actor: actor.id, isActive: coupon.isActive }).catch(() => null);

  return NextResponse.json({ ok: true, coupon });
}
