import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ name: z.string().min(2).max(60) });

export async function POST(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Nome inválido." }, { status: 400 });

    const cat = await prisma.forumCategory.create({
      data: { name: parsed.data.name, order: 50 },
      select: { id: true },
    });

    await audit("admin.forum.createCategory", "ForumCategory", cat.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}


export async function DELETE(req: Request) {
  try {
    const actor = await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ message: "id é obrigatório." }, { status: 400 });

    // Remove em cascata: posts -> tópicos -> boards -> categoria
    await prisma.$transaction(async (tx) => {
      const boards = await tx.forumBoard.findMany({ where: { categoryId: id }, select: { id: true } });
      const boardIds = boards.map(b => b.id);
      if (boardIds.length > 0) {
        const topics = await tx.topic.findMany({ where: { boardId: { in: boardIds } }, select: { id: true } });
        const topicIds = topics.map(t => t.id);
        if (topicIds.length > 0) {
          await tx.post.deleteMany({ where: { topicId: { in: topicIds } } });
          await tx.topic.deleteMany({ where: { id: { in: topicIds } } });
        }
        await tx.forumBoard.deleteMany({ where: { id: { in: boardIds } } });
      }
      await tx.forumCategory.delete({ where: { id } });
    }).catch(() => null);

    await audit("admin.forum.category.delete", "ForumCategory", id, { actor: actor.id });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
