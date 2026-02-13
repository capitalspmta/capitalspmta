
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const me = await requireUserApi();
  const body = await req.json().catch(() => null);
  const otherId = String(body?.userId || "");
  if (!otherId) return NextResponse.json({ message: "userId é obrigatório" }, { status: 400 });
  if (otherId === me.id) return NextResponse.json({ message: "Você não pode iniciar conversa consigo mesmo" }, { status: 400 });

  // find existing 1:1 conversation
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: { every: { userId: { in: [me.id, otherId] } } },
      AND: [
        { participants: { some: { userId: me.id } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ id: existing.id });

  const convo = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: me.id }, { userId: otherId }] },
    },
    select: { id: true },
  });
  return NextResponse.json({ id: convo.id });
}
