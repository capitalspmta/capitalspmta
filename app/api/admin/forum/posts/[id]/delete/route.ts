import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("MODERATOR");
  const post = await prisma.post.update({ where: { id: params.id }, data: { isDeleted: true } });
  await audit("admin.forum.post.delete", "Post", params.id, { actor: actor.id, topicId: post.topicId });
  const ref = req.headers.get("referer");
  return NextResponse.redirect(ref ? new URL(ref) : new URL("/forum", req.url));
}
