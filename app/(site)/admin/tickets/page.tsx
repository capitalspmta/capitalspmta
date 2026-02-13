import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function AdminTickets() {
  await requireRole("SUPPORT");

  const tickets = await prisma.ticket.findMany({
    where: { isDeleted: false },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { category: true, author: { select: { username: true } }, assignedTo: { select: { username: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets (Staff)</h1>
        <p className="mt-1 text-sm text-white/55">Fila de tickets para equipe (SUPPORT+).</p>
      </div>

      <Card className="p-5">
        <div className="divide-y divide-white/10">
          {tickets.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <Link href={`/tickets/${t.id}`} className="font-medium text-white/85 hover:text-white">{t.title}</Link>
                <div className="text-xs text-white/45 mt-1">
                  {t.category.name} • autor {t.author.username} • atribuído {t.assignedTo?.username ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{t.status}</Badge>
                <Badge>{t.priority}</Badge>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <div className="py-6 text-sm text-white/55">Nenhum ticket.</div>}
        </div>
      </Card>
    </div>
  );
}
