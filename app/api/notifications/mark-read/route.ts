import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";

const schema = z.object({
  ids: z.array(z.string().min(1)).default([]),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUserApi();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    if (parsed.data.all) {
      await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
      return NextResponse.json({ ok: true });
    }

    const ids = parsed.data.ids.filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ ok: true });

    await prisma.notification.updateMany({ where: { userId: user.id, id: { in: ids } }, data: { read: true } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
