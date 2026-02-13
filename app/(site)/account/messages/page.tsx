import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function AccountMessagesPage() {
  const me = await requireUser();
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: me.id } } },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: { include: { user: { select: { id: true, username: true, role: true } } } },
      messages: { where: { isDeleted: false }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas conversas</h1>
        <p className="mt-1 text-sm text-white/55">Bate-papos privados (estilo WhatsApp).</p>
      </div>

      <Card className="p-5">
        <div className="divide-y divide-white/10">
          {conversations.map((c: any) => {
            const other = c.participants.map((p) => p.user).find((u) => u.id !== me.id);
            const last = c.messages?.[0];
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="block py-3 hover:bg-white/5 rounded-xl px-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-white/85">{other?.username ?? "Conversa"}</div>
                    <div className="text-xs text-white/45 mt-1">
                      {last ? `${last.content?.slice(0, 80) || "(anexo)"}` : "Sem mensagens ainda"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {other?.role ? <Badge>{other.role}</Badge> : null}
                    <Badge>{new Date(c.updatedAt).toLocaleString("pt-BR")}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}
          {conversations.length === 0 && <div className="py-6 text-sm text-white/55">Você ainda não tem conversas.</div>}
        </div>
      </Card>
    </div>
  );
}
