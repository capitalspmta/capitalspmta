import Link from "next/link";
import type { SafeUser } from "@/lib/auth";
import { Badge, Input } from "./ui";
import NotificationsBell from "./NotificationsBell";

export default function Topbar({ user }: { user: SafeUser | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-black/20">
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Badge>{user.role}</Badge>
            <Link href="/account/profile" className="flex items-center gap-2 hover:opacity-95">
              <div className="h-9 w-9 rounded-full bg-white/10 border border-white/15 overflow-hidden flex items-center justify-center">
                <img src={`/avatars/${user.avatarKey || "avatar1"}.svg`} alt="avatar" className="h-full w-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm text-white/80 leading-4">{user.username}</div>
                <div className="text-[11px] text-white/45 leading-4">Meu perfil</div>
              </div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-sm text-white/80 hover:text-white">Entrar</Link>
            <Link href="/auth/register" className="text-sm text-white/80 hover:text-white">Criar conta</Link>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <form action="/search" method="get" className="hidden md:block">
          <Input name="q" placeholder="Pesquisar..." className="w-72" />
        </form>

        {user ? (
          <>
            <NotificationsBell />
            <form action="/api/auth/logout" method="post">
            <button className="text-sm text-white/70 hover:text-white underline">Sair</button>
          </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
