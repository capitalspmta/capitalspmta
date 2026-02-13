import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireUserApi();

    const [count, next] = await Promise.all([
      prisma.ticketRatingRequirement.count({ where: { raterId: user.id, completed: false } }),
      prisma.ticketRatingRequirement.findFirst({
        where: { raterId: user.id, completed: false },
        orderBy: { createdAt: "asc" },
        select: { ticketId: true },
      }),
    ]);

    const href = next?.ticketId ? `/tickets/${next.ticketId}/close` : null;
    return NextResponse.json({ count, nextTicketId: next?.ticketId ?? null, href });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ count: 0, nextTicketId: null, href: null }, { status: 200 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
