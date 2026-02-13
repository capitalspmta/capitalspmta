import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(4).max(120),
  content: z.string().min(4).max(20000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUserApi();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

    const cat = await prisma.ticketCategory.findUnique({ where: { id: parsed.data.categoryId } });
    if (!cat) return NextResponse.json({ message: "Categoria inválida." }, { status: 400 });

    const ticket = await prisma.ticket.create({
      data: {
        categoryId: cat.id,
        authorId: user.id,
        title: parsed.data.title,
        priority: parsed.data.priority,
        messages: { create: [{ authorId: user.id, content: parsed.data.content }] },
        participants: { create: [{ userId: user.id, addedById: user.id }] },
      },
      select: { id: true },
    });

    await audit("ticket.create", "Ticket", ticket.id, { category: cat.slug });

    // notificar staffs (SUPPORT+)
    const staff = await prisma.user.findMany({
      where: { isDeleted: false, role: { in: ["SUPPORT", "MODERATOR", "ADMIN", "OWNER"] } },
      select: { id: true },
    });
    const rows = staff.filter(s => s.id !== user.id).map((s) => ({
      userId: s.id,
      message: `🎫 Novo ticket: ${parsed.data.title}`,
      href: `/admin/tickets/${ticket.id}`,
    }));
    if (rows.length) await prisma.notification.createMany({ data: rows }).catch(() => null);
    return NextResponse.json({ ticketId: ticket.id });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHORIZED") return NextResponse.json({ message: "Faça login." }, { status: 401 });
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
