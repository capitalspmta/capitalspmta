import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  await requireRole("OWNER");

  const [products, roles] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        priceCents: true,
        grantVipRole: true,
        durationDays: true,
        description: true,
        mtaActions: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { rank: "desc" },
    }),
  ]);

  return NextResponse.json({ products, roles });
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  priceReais: z.number().finite().positive(),
  grantRoleName: z.string().min(2).max(32).nullable().optional(),
  durationDays: z.number().int().positive().nullable().optional(),
  mtaMoney: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  mtaAcl: z.string().trim().max(64).nullable().optional(),
});

export async function POST(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const roleName = parsed.data.grantRoleName ? parsed.data.grantRoleName.trim().toUpperCase() : null;
  if (roleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName }, select: { name: true } });
    if (!role) return NextResponse.json({ message: "Cargo não encontrado." }, { status: 404 });
  }

  const skuBase = parsed.data.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  const sku = `${skuBase || "produto"}-${Date.now().toString(36)}`;

  const priceCents = Math.round(parsed.data.priceReais * 100);

  // Monta ações MTA (entrega dentro do jogo) em formato JSON.
  // - vip: usa grantVipRole + durationDays
  // - money: usa mtaMoney
  // Observação: ACL continua sendo usada no endpoint de whitelist (retorna aclGroups).
  const mtaActionsList: any[] = [];
  if (roleName && parsed.data.durationDays && parsed.data.durationDays > 0) {
    mtaActionsList.push({ type: "vip", vipName: roleName, days: parsed.data.durationDays });
  }
  if (parsed.data.mtaMoney && parsed.data.mtaMoney > 0) {
    mtaActionsList.push({ type: "money", amount: parsed.data.mtaMoney });
  }

  const mtaActionsStore = mtaActionsList.length ? JSON.stringify(mtaActionsList) : null;
  const mtaActionsAcl = parsed.data.mtaAcl ? JSON.stringify({ aclGroup: String(parsed.data.mtaAcl).trim() }) : null;

  const product = await prisma.product.create({
    data: {
      sku,
      name: parsed.data.name.trim(),
      priceCents,
      grantVipRole: roleName, // pode ser null
      durationDays: parsed.data.durationDays ?? null,
      description: (parsed.data.description ?? null) ? String(parsed.data.description).trim() : null,
      // Preferimos ações de entrega (vip/money). ACL permanece como fallback.
      mtaActions: mtaActionsStore ?? mtaActionsAcl,
      isActive: true,
    },
    select: { id: true, sku: true, name: true, priceCents: true, grantVipRole: true, durationDays: true, description: true, mtaActions: true, isActive: true },
  });

  await audit("owner.product.create", "Product", product.id, { actor: actor.id, sku: product.sku, grantRole: roleName }).catch(() => null);

  return NextResponse.json({ ok: true, product });
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

  const product = await prisma.product.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, sku: true, name: true, priceCents: true, grantVipRole: true, isActive: true },
  });

  await audit("owner.product.update", "Product", product.id, { actor: actor.id, isActive: product.isActive }).catch(() => null);

  return NextResponse.json({ ok: true, product });
}
