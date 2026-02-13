import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cats = await prisma.ticketCategory.findMany({
    orderBy: { order: "asc" },
    select: { id: true, slug: true, name: true, description: true },
  });
  return NextResponse.json(cats);
}
