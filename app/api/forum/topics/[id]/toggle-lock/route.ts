import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MODERATOR");
    const topic = await prisma.topic.findUnique({ where: { id: params.id } });
    if (!topic) return NextResponse.json({ message: "Tópico não encontrado." }, { status: 404 });

    const next = topic.status === "OPEN" ? "LOCKED" : (topic.status === "LOCKED" ? "LOCKED_ADMIN" : "OPEN");
    await prisma.topic.update({ where: { id: topic.id }, data: { status: next } });
    await audit("forum.topic.toggleLock", "Topic", topic.id, { to: next });

    return NextResponse.redirect(new URL(`/forum/topic/${topic.id}`, req.url));
  } catch (e: any) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
