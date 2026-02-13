
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { resolveBoardId } from "@/lib/forumSystemBoards";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUserApi();
  await requirePermission(user, "forum.topic.move");

  let boardId: string | null = null;
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  if (isJson) {
    const body = await req.json().catch(() => null);
    boardId = body?.boardId || null;
  } else {
    const form = await req.formData().catch(() => null as any);
    boardId = (form && (form.get("boardId") as any)) ? String(form.get("boardId")) : null;
  }
  if (!boardId) return NextResponse.json({ message: "boardId é obrigatório." }, { status: 400 });

  const resolved = await resolveBoardId(String(boardId));
  if (!resolved) return NextResponse.json({ message: "Board inválida." }, { status: 400 });
  boardId = resolved;

  const topic = await prisma.topic.findUnique({ where: { id: params.id }, select: { id: true, boardId: true, title: true } });
  if (!topic) return NextResponse.json({ message: "Tópico não encontrado." }, { status: 404 });

  await prisma.topic.update({ where: { id: topic.id }, data: { boardId } });
  await audit("forum.topic.move", "ForumTopic", topic.id, { from: topic.boardId, to: boardId, title: topic.title });

  if (!isJson) {
    return NextResponse.redirect(new URL(`/forum/topic/${topic.id}`, req.url));
  }
  return NextResponse.json({ ok: true });
}
