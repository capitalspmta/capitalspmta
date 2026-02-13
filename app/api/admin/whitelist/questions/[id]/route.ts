import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const patchSchema = z.object({
  prompt: z.string().trim().min(3).max(500).optional(),
  required: z.coerce.boolean().optional(),
  order: z.coerce.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });

  const q = await prisma.whitelistQuestion.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await audit("admin.whitelist.question.update", "WhitelistQuestion", q.id, { actor: actor.id });
  return NextResponse.json({ ok: true });
}
