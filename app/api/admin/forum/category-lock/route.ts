import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { hasAtLeast } from "@/lib/rbac";
import { audit } from "@/lib/audit";

const schema = z.object({ id: z.string().min(1), lockedAdminOnly: z.boolean() });

// Tranca/destranca uma categoria via SiteSetting (sem migration).
// lockedAdminOnly=true => somente ADMIN+ pode criar tópicos/responder nos boards da categoria.
export async function PUT(req: Request) {
  try {
    const actor = await requireUserApi();
    if (!hasAtLeast(actor as any, "ADMIN" as any)) return NextResponse.json({ message: "Sem permissão." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const key = `forum.category.locked.${parsed.data.id}`;
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: parsed.data.lockedAdminOnly ? "1" : "0" },
      create: { key, value: parsed.data.lockedAdminOnly ? "1" : "0" },
    });

    await audit("forum.category.lock", "ForumCategory", parsed.data.id, { lockedAdminOnly: parsed.data.lockedAdminOnly, by: actor.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
