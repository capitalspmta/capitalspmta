import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const actor = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  if (parsed.data.id === actor.id) return NextResponse.json({ message: "Você não pode apagar a si mesmo." }, { status: 400 });

  await prisma.user.update({ where: { id: parsed.data.id }, data: { isDeleted: true } });
  await audit("admin.user.delete", "User", parsed.data.id, { actor: actor.id });
  return NextResponse.json({ ok: true });
}
