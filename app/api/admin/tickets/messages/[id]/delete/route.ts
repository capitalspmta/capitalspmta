import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const actor = await requireRole("MODERATOR");
  const msg = await prisma.ticketMessage.update({ where: { id: params.id }, data: { isDeleted: true } });
  await audit("admin.ticket.message.delete", "TicketMessage", params.id, { actor: actor.id, ticketId: msg.ticketId });
  const ref = req.headers.get("referer");
  return NextResponse.redirect(ref ? new URL(ref) : new URL(`/tickets/${msg.ticketId}`, req.url));
}
