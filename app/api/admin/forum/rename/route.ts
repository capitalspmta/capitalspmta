import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  kind: z.enum(["category", "board", "topic"]),
  id: z.string().min(1),
  name: z.string().min(2).max(80),
});

export async function PUT(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    if (parsed.data.kind === "category") {
      await prisma.forumCategory.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name } });
    } else if (parsed.data.kind === "board") {
      await prisma.forumBoard.update({ where: { id: parsed.data.id }, data: { name: parsed.data.name } });
    } else {
      await prisma.topic.update({ where: { id: parsed.data.id }, data: { title: parsed.data.name } });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ message: "Sem permissão ou erro." }, { status: 403 });
  }
}
