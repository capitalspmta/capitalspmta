import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MODERATOR");
    const topic = await prisma.topic.findUnique({ where: { id: params.id } });
    if (!topic) return NextResponse.json({ message: "Tópico não encontrado." }, { status: 404 });

    const next = !topic.pinned;
    await prisma.topic.update({ where: { id: topic.id }, data: { pinned: next } });
    await audit("forum.topic.togglePin", "Topic", topic.id, { to: next });

    return NextResponse.redirect(new URL(`/forum/topic/${topic.id}`, req.url));
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
