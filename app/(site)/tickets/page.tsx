import Link from "next/link";
import { requireActiveUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function TicketsHome() {
  const user = await requireActiveUser();
  const tickets = await prisma.ticket.findMany({
    where: { authorId: user.id, isDeleted: false },
    orderBy: { updatedAt: "desc" },
    include: { category: true },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="mt-1 text-sm text-white/55">Abra um ticket por categoria (ajuda, denúncia, unban, compras).</p>
        </div>
        <Link href="/tickets/new" className="text-sm text-white underline hover:text-white/90">
          Abrir ticket
        </Link>
      </div>

      <Card className="p-5">
        <div className="divide-y divide-white/10">
          {tickets.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <Link href={`/tickets/${t.id}`} className="font-medium text-white/85 hover:text-white">
                  {t.title}
                </Link>
                <div className="text-xs text-white/45 mt-1">{t.category.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{t.status}</Badge>
                <Badge>{t.priority}</Badge>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <div className="py-6 text-sm text-white/55">Você ainda não abriu tickets.</div>}
        </div>
      </Card>
    </div>
  );
}
