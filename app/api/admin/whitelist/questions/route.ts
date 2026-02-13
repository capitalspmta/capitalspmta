import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function GET() {
  await requireRole("SUPPORT");
  const questions = await prisma.whitelistQuestion.findMany({ orderBy: { order: "asc" } });
  const cfg = await prisma.whitelistConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ cfg, questions });
}

const createSchema = z.object({
  prompt: z.string().transform((s) => s.trim()).refine((s) => s.length >= 3, "Prompt muito curto").refine((s) => s.length <= 500, "Prompt muito longo"),
  required: z.coerce.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

export async function POST(req: Request) {
try {
  const actor = await requireRole("ADMIN");
  const ct = req.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await req.json().catch(() => null)
    : await (async () => {
        const fd = await req.formData().catch(() => null);
        if (!fd) return null;
        return {
          prompt: String(fd.get("prompt") ?? "").trim(),
          required: String(fd.get("required") ?? "true") !== "false",
          order: Number(fd.get("order") ?? 0) || 0,
        };
      })();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });

  const q = await prisma.whitelistQuestion.create({ data: parsed.data });
  await audit("admin.whitelist.question.create", "WhitelistQuestion", q.id, { actor: actor.id });
  return NextResponse.json({ ok: true, id: q.id });
} catch (e: any) {
  const msg = String(e?.message || "Erro ao criar pergunta.");
  return NextResponse.json({ message: msg }, { status: 500 });
}
}

const delSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = delSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  await prisma.whitelistQuestion.delete({ where: { id: parsed.data.id } });
  await audit("admin.whitelist.question.delete", "WhitelistQuestion", parsed.data.id, { actor: actor.id });
  return NextResponse.json({ ok: true });
}
