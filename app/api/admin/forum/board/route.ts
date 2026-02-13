import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2).max(60),
  categoryId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const cat = await prisma.forumCategory.findUnique({ where: { id: parsed.data.categoryId } });
    if (!cat) return NextResponse.json({ message: "Categoria inválida." }, { status: 400 });

    const board = await prisma.forumBoard.create({
      data: { name: parsed.data.name, categoryId: cat.id, order: 50 },
      select: { id: true },
    });

    await audit("admin.forum.createBoard", "ForumBoard", board.id, { categoryId: cat.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}


const updateSchema = z.object({
  id: z.string().min(1),
  requireWhitelist: z.boolean().optional(),
  allowReplies: z.boolean().optional(),
  pointsOnTopic: z.number().int().min(0).max(100).optional(),
  pointsOnReply: z.number().int().min(0).max(50).optional(),
});

export async function PUT(req: Request) {
  try {
    const actor = await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    await prisma.forumBoard.update({
      where: { id: parsed.data.id },
      data: {
        requireWhitelist: parsed.data.requireWhitelist,
        allowReplies: parsed.data.allowReplies,
        pointsOnTopic: parsed.data.pointsOnTopic,
        pointsOnReply: parsed.data.pointsOnReply,
      },
    });

    await audit("admin.forum.updateBoard", "ForumBoard", parsed.data.id, { actor: actor.id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
