
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getSessionUser();
  const q = (searchParams.q || "").trim();
  if (!q) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Pesquisar</h1>
        <p className="mt-2 text-white/60">Digite algo na barra de pesquisa acima.</p>
      </div>
    );
  }

  const isStaff = user ? (await hasPermission(user, "ticket.view.all")) : false;

  // Fórum: tópicos e posts (apenas não deletados)
  const topics = await prisma.topic.findMany({
    where: { isDeleted: false, title: { contains: q } },
    take: 10,
    orderBy: { lastPostAt: "desc" },
    include: { board: true, author: { select: { id: true, username: true } } },
  });

  const posts = await prisma.post.findMany({
    where: { isDeleted: false, content: { contains: q } },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { topic: true, author: { select: { id: true, username: true } } },
  });

  const users = await prisma.user.findMany({
    where: { isDeleted: false, OR: [{ username: { contains: q } }, { email: { contains: q } }] },
    take: 10,
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, username: true, role: true, lastSeenAt: true },
  });

  const tickets = user
    ? await prisma.ticket.findMany({
        where: isStaff
          ? { title: { contains: q }, isDeleted: false }
          : { authorId: user.id, title: { contains: q }, isDeleted: false },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, createdAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold">Resultados para: <span className="text-white/70">{q}</span></h1>
        <p className="mt-2 text-white/50 text-sm">Mostrando itens que você tem permissão para ver.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold">Tópicos</h2>
        <div className="mt-3 space-y-2">
          {topics.length ? topics.map(t => (
            <Link key={t.id} href={`/forum/topic/${t.id}`} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
              <div className="text-white/90">{t.title}</div>
              <div className="text-xs text-white/45">Board: {t.board.name} • por {t.author.username}</div>
            </Link>
          )) : <div className="text-white/50 text-sm">Nenhum tópico encontrado.</div>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold">Mensagens do fórum</h2>
        <div className="mt-3 space-y-2">
          {posts.length ? posts.map(p => (
            <Link key={p.id} href={`/forum/topic/${p.topicId}`} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
              <div className="text-white/80 line-clamp-2">{p.content}</div>
              <div className="text-xs text-white/45">Tópico: {p.topic.title} • por {p.author.username}</div>
            </Link>
          )) : <div className="text-white/50 text-sm">Nenhuma mensagem encontrada.</div>}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold">Usuários</h2>
        <div className="mt-3 space-y-2">
          {users.length ? users.map(u => (
            <Link key={u.id} href={`/profile/${u.id}`} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
              <div className="flex items-center justify-between">
                <div className="text-white/90">@{u.username}</div>
                <div className="text-xs text-white/45">{u.role}</div>
              </div>
              <div className="text-xs text-white/45">Último online: {new Date(u.lastSeenAt).toLocaleString("pt-BR")}</div>
            </Link>
          )) : <div className="text-white/50 text-sm">Nenhum usuário encontrado.</div>}
        </div>
      </div>

      {user ? (
        <div className="card">
          <h2 className="font-semibold">Tickets</h2>
          <div className="mt-3 space-y-2">
            {tickets.length ? tickets.map(t => (
              <Link key={t.id} href={`/tickets/${t.id}`} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
                <div className="text-white/90">{t.title}</div>
                <div className="text-xs text-white/45">Status: {t.status}</div>
              </Link>
            )) : <div className="text-white/50 text-sm">Nenhum ticket encontrado.</div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
