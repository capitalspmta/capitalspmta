import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { resolveBoardId } from "@/lib/forumSystemBoards";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");
  const trashBoardId = await resolveBoardId("board-lixeira");
  if (trashBoardId) {
    await prisma.topic.update({ where: { id: params.id }, data: { boardId: trashBoardId, isDeleted: false, pinned: false } }).catch(() => null);
  } else {
    await prisma.topic.update({ where: { id: params.id }, data: { isDeleted: true } }).catch(() => null);
  }
  await audit("admin.forum.topic.delete", "Topic", params.id, { actor: actor.id });
  return NextResponse.redirect(new URL("/forum", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
