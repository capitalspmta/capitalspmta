import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Card, Badge } from "@/components/ui";

export default async function BlockedPage({ searchParams }: { searchParams: { until?: string } }) {
  const user = await requireUser();
  const until = searchParams.until ? new Date(searchParams.until) : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conta bloqueada</h1>
        <p className="mt-1 text-sm text-white/55">Seu acesso está temporariamente suspenso.</p>
      </div>
      <Card className="p-5">
        <div className="text-sm text-white/70">
          Usuário: <span className="font-semibold text-white/85">{user.username}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge>BLOQUEIO</Badge>
          {until && <Badge>Até {until.toLocaleString("pt-BR")}</Badge>}
        </div>
        <div className="mt-4 text-sm text-white/60">
          Se você acredita que isso foi um engano, abra um ticket de revogação de banimento (quando liberado) ou contate a equipe no Discord.
        </div>
      </Card>
    </div>
  );
}
