import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireActiveUser();

  const body = await req.json().catch(() => null);
  const emoji = String(body?.emoji || "👍").slice(0, 16);

  const post = await prisma.post.findUnique({ where: { id: params.id }, select: { id: true, isDeleted: true } });
  if (!post || post.isDeleted) return NextResponse.json({ message: "Post não encontrado." }, { status: 404 });

  const where = { postId_userId_emoji: { postId: params.id, userId: user.id, emoji } } as any;

  const existing = await prisma.postReaction.findUnique({ where }).catch(() => null);
  if (existing) {
    await prisma.postReaction.delete({ where });
  } else {
    await prisma.postReaction.create({ data: { postId: params.id, userId: user.id, emoji } });
  }

  const count = await prisma.postReaction.count({ where: { postId: params.id, emoji } });
  const mine = await prisma.postReaction.findUnique({ where }).then(Boolean).catch(() => false);

  return NextResponse.json({ emoji, count, mine });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireActiveUser();
  const emoji = "👍";
  const count = await prisma.postReaction.count({ where: { postId: params.id, emoji } });
  const mine = await prisma.postReaction.findUnique({ where: { postId_userId_emoji: { postId: params.id, userId: user.id, emoji } } as any }).then(Boolean).catch(() => false);
  return NextResponse.json({ emoji, count, mine });
}
