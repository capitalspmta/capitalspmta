import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { toggleJsonArrayItem } from "@/lib/settings";

const schema = z.object({
  kind: z.enum(["board", "topic"]),
  id: z.string().min(1),
  hidden: z.boolean(),
});

export async function PUT(req: Request) {
  try {
    await requireRole("ADMIN");
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const key = parsed.data.kind === "board" ? "forum.hiddenBoards" : "forum.hiddenTopics";
    await toggleJsonArrayItem(key, parsed.data.id, parsed.data.hidden);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
