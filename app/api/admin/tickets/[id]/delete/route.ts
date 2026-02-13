import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  const ref = req.headers.get("referer");
  const back = ref ? new URL(ref) : new URL("/tickets", req.url);

  if (!ticket) return NextResponse.redirect(back);
  if (ticket.status !== "CLOSED") {
    // segurança: não permite apagar antes de fechar (avaliação é obrigatória)
    back.searchParams.set("err", "close_first");
    return NextResponse.redirect(back);
  }

  await prisma.ticket.update({ where: { id: params.id }, data: { isDeleted: true } }).catch(() => null);
  await audit("admin.ticket.delete", "Ticket", params.id, { actor: actor.id });

  return NextResponse.redirect(back);
}
