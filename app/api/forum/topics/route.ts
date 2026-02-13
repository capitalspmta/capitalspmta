import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hasAtLeast } from "@/lib/rbac";

const schema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(4).max(120),
  content: z.string().min(4).max(20000),
  imageUrls: z.array(z.string().min(3)).max(6).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUserApi();
    let body: any = null;
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await req.json().catch(() => null);
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        boardId: String(form.get("boardId") || ""),
        title: String(form.get("title") || ""),
        content: String(form.get("content") || ""),
        imageUrls: form.getAll("imageUrls").map((x) => String(x)),
      };
    } else {
      body = await req.json().catch(() => null);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const { boardId, title, content } = parsed.data;
    const board = await prisma.forumBoard.findUnique({ where: { id: boardId } });
    if (!board) return NextResponse.json({ message: "Board inválida." }, { status: 400 });

    // Locks / regras de postagem
    // 1) Categoria trancada (admin-only) via SiteSetting
    const catLockKey = `forum.category.locked.${board.categoryId}`;
    const catLock = await prisma.siteSetting.findUnique({ where: { key: catLockKey }, select: { value: true } });
    const catAdminOnly = catLock?.value === "1";
    if (catAdminOnly && !hasAtLeast(user as any, "ADMIN" as any)) {
      return NextResponse.json({ message: "Esta categoria está trancada: somente ADMIN pode postar." }, { status: 403 });
    }

    // 2) Board: allowReplies=false => somente ADMIN pode postar (tópicos/respostas)
    if (!board.allowReplies && !hasAtLeast(user as any, "ADMIN" as any)) {
      return NextResponse.json({ message: "Este board está trancado: somente ADMIN pode postar." }, { status: 403 });
    }

    // 3) Board exige whitelist aprovada (players). Staff pode postar mesmo sem whitelist.
    if (board.requireWhitelist) {
      const isStaff = hasAtLeast(user as any, "SUPPORT" as any);
      if (!isStaff && (user as any).whitelistStatus !== "APPROVED") {
        return NextResponse.json({ message: "Você precisa estar com whitelist aprovada para postar neste board." }, { status: 403 });
      }
    }

    const topic = await prisma.topic.create({
      data: { boardId, authorId: user.id, title },
      select: { id: true },
    });

    const firstPost = await prisma.post.create({
      data: { topicId: topic.id, authorId: user.id, content },
      select: { id: true },
    });

    const imageUrls = parsed.data.imageUrls ?? [];
    if (imageUrls.length) {
      await prisma.postAttachment.createMany({
        data: imageUrls.map((url) => ({ postId: firstPost.id, url })),
      });
    }

// pontos por tópico
    const pointsOnTopic = (board as any)?.pointsOnTopic ?? 0;
    if (pointsOnTopic > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { points: { increment: pointsOnTopic } } });
    }

    await audit("forum.topic.create", "Topic", topic.id, { boardId });
    return NextResponse.json({ topicId: topic.id });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
