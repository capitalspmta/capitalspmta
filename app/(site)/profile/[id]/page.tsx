import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/guards";
import { Card, Badge, Button } from "@/components/ui";
import Link from "next/link";
import ProfileMessageButton from "@/components/ProfileMessageButton";

const VIP_ROLES = ["APOIADOR", "INVESTIDOR", "PATROCINADOR"] as const;

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const me = await requireActiveUser();
  const now = new Date();
  const u = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      role: true,
      points: true,
      lastSeenAt: true,
      userBadges: { include: { badge: true } },
      entitlements: { where: { expiresAt: { gt: now } }, select: { roleName: true, expiresAt: true } },
    },
  });
  if (!u) return <div className="text-white/70">Usuário não encontrado.</div>;

  const activeVip = (u.entitlements || [])
    .filter((e: any) => VIP_ROLES.includes(e.roleName))
    .sort((a: any, b: any) => a.roleName.localeCompare(b.roleName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-white/55">Informações públicas do jogador.</p>
      </div>

      <Card className="p-5 space-y-3">
        <div className="text-xl font-semibold text-white/90">{u.username}</div>
        {me.id !== u.id ? (
          <div className="pt-1">
            <ProfileMessageButton userId={u.id} />
          </div>
        ) : null}

        {(me.role === "ADMIN" || me.role === "OWNER") ? (
          <div className="pt-1">
            <Link href={`/admin/users?manage=${u.id}`}>
              <Button variant="ghost">Config</Button>
            </Link>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Badge>{u.role}</Badge>
          <Badge>Pontos: {u.points}</Badge>
          <Badge>Online: {new Date(u.lastSeenAt).toLocaleString("pt-BR")}</Badge>
        </div>

        <div className="mt-2">
          <div className="text-sm text-white/70 mb-2">VIP</div>
          <div className="flex flex-wrap gap-2">
            {activeVip.map((v: any) => (
              <span
                key={v.roleName}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-100 shadow-sm"
                title={`Ativo até ${new Date(v.expiresAt).toLocaleString("pt-BR")}`}
              >
                ✦ {v.roleName}
              </span>
            ))}
            {activeVip.length === 0 && <div className="text-sm text-white/55">Sem VIP ativo.</div>}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm text-white/70 mb-2">Emblemas</div>
          <div className="flex flex-wrap gap-2">
            {u.userBadges.map((b: any) => (
              <Badge key={b.badgeId}>{b.badge.icon ? `${b.badge.icon} ` : ""}{b.badge.name}</Badge>
            ))}
            {u.userBadges.length === 0 && <div className="text-sm text-white/55">Sem emblemas.</div>}
          </div>
        </div>
      </Card>
    </div>
  );
}
