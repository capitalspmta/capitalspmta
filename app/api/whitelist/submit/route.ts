import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), value: z.string().max(5000) })),
});

export async function POST(req: Request) {
  const user = await requireUserApi();
  const cfg = await prisma.whitelistConfig.findUnique({ where: { id: "singleton" } });
  if (!cfg?.enabled) return NextResponse.json({ message: "Whitelist desativada." }, { status: 400 });
  if (cfg.pausedUntil && cfg.pausedUntil.getTime() > Date.now()) {
    return NextResponse.json({ message: "Whitelist em espera no momento." }, { status: 400 });
  }

  let payload: any = null;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    payload = await req.json().catch(() => null);
  } else {
    const fd = await req.formData();
    const answers: Array<{ questionId: string; value: string }> = [];
    for (const [k, v] of fd.entries()) {
      if (!k.startsWith("q_")) continue;
      const questionId = k.slice(2);
      answers.push({ questionId, value: String(v ?? "") });
    }
    payload = { answers };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
const questions = await prisma.whitelistQuestion.findMany({ orderBy: { order: "asc" } });
  const qMap = new Map(questions.map((q) => [q.id, q]));
  for (const a of parsed.data.answers) {
    const q = qMap.get(a.questionId);
    if (!q) return NextResponse.json({ message: "Pergunta inválida." }, { status: 400 });
    if (q.required && !a.value.trim()) return NextResponse.json({ message: "Preencha todas as perguntas obrigatórias." }, { status: 400 });
  }

  // impede spam: se já tem pendente, não cria outra
  const existingPending = await prisma.whitelistApplication.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (existingPending) return NextResponse.json({ message: "Você já possui uma whitelist pendente." }, { status: 409 });

  const app = await prisma.whitelistApplication.create({
    data: {
      userId: user.id,
      status: "PENDING",
      answers: {
        create: parsed.data.answers.map((a) => ({ questionId: a.questionId, value: a.value })),
      },
    },
    select: { id: true },
  });

  await prisma.user.update({ where: { id: user.id }, data: { whitelistStatus: "PENDING" } });
  await audit("whitelist.submit", "WhitelistApplication", app.id, { userId: user.id });

  // notificar staffs (SUPPORT+)
  const staff = await prisma.user.findMany({
    where: { isDeleted: false, role: { in: ["SUPPORT", "MODERATOR", "ADMIN", "OWNER"] } },
    select: { id: true },
  });
  const rows = staff.filter(s => s.id !== user.id).map((s) => ({
    userId: s.id,
    message: `📝 Nova whitelist enviada por ${user.username}`,
    href: `/admin/whitelist`,
  }));
  if (rows.length) await prisma.notification.createMany({ data: rows }).catch(() => null);

  return NextResponse.json({ ok: true, id: app.id });
}
