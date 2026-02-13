import Link from "next/link";
import Brand from "./Brand";
import { SafeUser } from "@/lib/auth";

const rank: Record<string, number> = { USER: 1, SUPPORT: 2, MODERATOR: 3, ADMIN: 4, OWNER: 5 };

export default function Sidebar({ user }: { user: SafeUser | null }) {
  const r = user?.role ? rank[user.role] : 0;
  const whitelistOk = (user?.whitelistStatus ?? "APPROVED") === "APPROVED";
  const isStaff = r >= rank["SUPPORT"];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-white/10 bg-black/20">
      <div className="p-4">
        <Brand />
      </div>

      <nav className="px-2 pb-4 text-sm">
        {/* Se o usuário não está aprovado na whitelist, mostramos apenas Whitelist + Conta */}
        {user && !whitelistOk && !isStaff ? (
          <>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/whitelist">Whitelist</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/account/profile">Minha conta</Link>
          </>
        ) : (
          <>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/forum">Fórum</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/forum/ranking">Ranking</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/tickets">Tickets</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/store">Loja</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/account/purchases">Compras</Link>
          </>
        )}

        {/* Evita duplicar "Minha conta" quando o usuário ainda está em whitelist */}
        {user && !(user && !whitelistOk && !isStaff) && (
          <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/account/profile">
            Minha conta
          </Link>
        )}

        {r >= rank["SUPPORT"] && (
          <>
            <div className="mt-4 px-3 text-xs uppercase tracking-wide text-white/40">Staff</div>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/tickets">Tickets</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/whitelist">Whitelist</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/purchases">Compras</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/staff">Bate ponto</Link>
          </>
        )}

        {r >= rank["MODERATOR"] && (
          <>
            <div className="mt-4 px-3 text-xs uppercase tracking-wide text-white/40">Moderação</div>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/logs">Logs</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/tickets/logs">Logs de Tickets</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/moderation/deleted-posts">Conteúdo removido</Link>
          </>
        )}

        {r >= rank["ADMIN"] && (
          <>
            <div className="mt-4 px-3 text-xs uppercase tracking-wide text-white/40">Admin</div>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/users">Usuários</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/forum">Fórum (config)</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/roles">Cargos & Permissões</Link>
          </>
        )}

        {r >= rank["OWNER"] && (
          <>
            <div className="mt-4 px-3 text-xs uppercase tracking-wide text-white/40">Dono</div>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/owner">Painel do Dono</Link>
            <Link className="block px-3 py-2 rounded-xl hover:bg-white/5 text-white/80" href="/admin/owner/products">Produtos (loja)</Link>
          </>
        )}
      </nav>

      <div className="mt-auto p-4 text-xs text-white/35">Visual dark moderno • GTA5 vibe</div>
    </aside>
  );
}
