import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function AdminLogs() {
  await requireRole("MODERATOR");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { username: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Logs (Auditoria)</h1>
        <p className="mt-1 text-sm text-white/55">Tudo que acontecer via API gera log (ator, ação, entidade, meta).</p>
      </div>

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/55">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-3">Quando</th>
              <th className="py-2 pr-3">Ator</th>
              <th className="py-2 pr-3">Ação</th>
              <th className="py-2 pr-3">Entidade</th>
              <th className="py-2 pr-3">Detalhes</th>
              <th className="py-2 pr-3">IP</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-white/5">
                <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("pt-BR")}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{l.actor ? `${l.actor.username} (${l.actor.role})` : "—"}</td>
                <td className="py-2 pr-3"><Badge>{l.action}</Badge></td>
                <td className="py-2 pr-3 whitespace-nowrap">{l.entityType}{l.entityId ? `:${l.entityId}` : ""}</td>

                <td className="py-2 pr-3 whitespace-nowrap">{l.entityType}{l.entityId ? `:${l.entityId}` : ""}</td>
                <td className="py-2 pr-3">
                  <div className="max-w-[560px] whitespace-pre-wrap break-words text-xs text-white/70">
                    {(() => {
                      if (!l.meta) return "—";
                      try {
                        const m = JSON.parse(l.meta);
                        // deixa explícito quando for ação em outro usuário
                        const target = m?.targetUserId || m?.userId || m?.affectedUserId;
                        const header = target ? `alvo:${target}\n` : "";
                        return header + JSON.stringify(m, null, 2);
                      } catch {
                        return String(l.meta);
                      }
                    })()}
                  </div>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{l.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
