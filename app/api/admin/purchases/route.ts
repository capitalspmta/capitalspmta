import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("SUPPORT");
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true, email: true } },
      items: { select: { sku: true, name: true } },
    },
    // Sem limite nas telas de staff pode ficar pesado; deixamos um teto alto.
    // Se quiser realmente ilimitado, remova este take.
    take: 5000,
  });
  return NextResponse.json(purchases);
}
