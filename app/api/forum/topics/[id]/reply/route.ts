import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hasAtLeast } from "@/lib/rbac";

const schema = z.object({ content: z.string().min(1).max(20000), imageUrls: z.array(z.string().min(3)).max(6).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUserApi();
    let body: any = null;
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await req.json().catch(() => null);
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        content: String(form.get("content") || ""),
        imageUrls: form.getAll("imageUrls").map((x) => String(x)),
      };
    } else {
      body = await req.json().catch(() => null);
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Mensagem inválida." }, { status: 400 });

    const topic = await prisma.topic.findUnique({ where: { id: params.id }, include: { board: true } });
    if (!topic) return NextResponse.json({ message: "Tópico não encontrado." }, { status: 404 });
    // Locks por categoria/board (admin-only)
    const catLockKey = `forum.category.locked.${topic.board.categoryId}`;
    const catLock = await prisma.siteSetting.findUnique({ where: { key: catLockKey }, select: { value: true } });
    const catAdminOnly = catLock?.value === "1";
    if (catAdminOnly && !hasAtLeast(user as any, "ADMIN" as any)) {
      return NextResponse.json({ message: "Esta categoria está trancada: somente ADMIN pode postar." }, { status: 403 });
    }

    if (!topic.board.allowReplies && !hasAtLeast(user as any, "ADMIN" as any)) {
      return NextResponse.json({ message: "Este board está trancado: somente ADMIN pode postar." }, { status: 403 });
    }

    if (topic.board.requireWhitelist) {
      const isStaff = hasAtLeast(user as any, "SUPPORT" as any);
      if (!isStaff && (user as any).whitelistStatus !== "APPROVED") {
        return NextResponse.json({ message: "Você precisa estar com whitelist aprovada para postar neste board." }, { status: 403 });
      }
    }
    if (topic.status === "LOCKED") return NextResponse.json({ message: "Tópico trancado." }, { status: 403 });
    if (topic.status === "LOCKED_ADMIN" && user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json({ message: "Somente administradores podem responder neste tópico." }, { status: 403 });
    }

    const post = await prisma.post.create({
      data: {
        topicId: topic.id,
        authorId: user.id,
        content: parsed.data.content,
        attachments: parsed.data.imageUrls && parsed.data.imageUrls.length
          ? { create: parsed.data.imageUrls.slice(0, 6).map((url) => ({ url })) }
          : undefined,
      },
      select: { id: true },
    });
    await prisma.topic.update({ where: { id: topic.id }, data: { lastPostAt: new Date() } });

    await audit("forum.post.create", "Post", post.id, { topicId: topic.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
