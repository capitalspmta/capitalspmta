import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { vipRoleFromSku, ensureUserHasRole } from "@/lib/vip";

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
});

export async function POST(req: Request) {
  const actor = await requireRole("SUPPORT");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const purchase = await prisma.purchase.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  if (parsed.data.status === "PAID") {
    try {
      const meta = purchase.meta ? JSON.parse(purchase.meta) : {};
      const sku = String(meta.sku || "");
      const vipRole = vipRoleFromSku(sku);
      if (vipRole) {
        await ensureUserHasRole(purchase.userId, vipRole);
      }
    } catch {}
  }
  await audit("admin.purchase.setStatus", "Purchase", parsed.data.id, { actor: actor.id, status: parsed.data.status });

  return NextResponse.json({ ok: true });
}
