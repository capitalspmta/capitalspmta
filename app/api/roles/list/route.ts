import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

// Lista de cargos (Role model) para autocomplete de @cargo
export async function GET() {
  try {
    await requireUserApi();
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, rank: true, colorHex: true },
      orderBy: { rank: "desc" },
      take: 50,
    });
    return NextResponse.json({ roles });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
