import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { resolveBoardId } from "@/lib/forumSystemBoards";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireUserApi();

  const topic = await prisma.topic.findUnique({ where: { id: params.id }, select: { id: true, authorId: true, createdAt: true, isDeleted: true, boardId: true } });
  if (!topic) return NextResponse.redirect(new URL("/forum", req.url));
  if (topic.isDeleted) return NextResponse.redirect(new URL(`/forum/topic/${topic.id}`, req.url));

  const isAdmin = hasAtLeast(actor as any, "ADMIN" as any);

  // Apenas o criador pode apagar (usuário). Admin usa rota admin.
  if (topic.authorId !== actor.id || isAdmin) {
    return NextResponse.redirect(new URL(`/forum/topic/${topic.id}?err=no_perm`, req.url));
  }

  const createdAt = new Date(topic.createdAt).getTime();
  const now = Date.now();
  const diffMin = (now - createdAt) / 60000;

  if (diffMin > 20) {
    return NextResponse.redirect(new URL(`/forum/topic/${topic.id}?err=timeout`, req.url));
  }

  const trashBoardId = await resolveBoardId("board-lixeira");
  if (trashBoardId) {
    await prisma.topic.update({ where: { id: topic.id }, data: { boardId: trashBoardId, isDeleted: false, pinned: false } });
  } else {
    await prisma.topic.update({ where: { id: topic.id }, data: { isDeleted: true } });
  }
  await audit("forum.topic.delete.self", "Topic", topic.id, { actor: actor.id, withinMinutes: Math.floor(diffMin) });

  return NextResponse.redirect(new URL("/forum", req.url));
}
