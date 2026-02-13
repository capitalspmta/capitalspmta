import Link from "next/link";
import UserHoverLink from "@/components/UserHoverLink";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/guards";
import { hasAtLeast } from "@/lib/rbac";
import { getJsonArray } from "@/lib/settings";
import { Card, Badge } from "@/components/ui";
import ReplyBox from "./reply";
import PostReactions from "@/components/PostReactions";
import { roleLabel } from "@/lib/role-label";

export default async function TopicPage({ params }: { params: { id: string } }) {
  const user = await requireActiveUser();
  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: {
      board: { include: { category: true } },
      author: { select: { id: true, username: true } },
      posts: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, username: true, role: true } }, attachments: true } },
    },
  });

  // Carrega reações (👍) em separado para evitar erro caso o model Post não tenha relação "reactions" no Prisma Client
  const reactionCounts: Record<string, number> = {};
  const reactionMine: Record<string, boolean> = {};
  try {
    const postIds = topic?.posts?.map((p: any) => p.id) || [];
    if (postIds.length && (prisma as any).postReaction) {
      const reacts = await (prisma as any).postReaction.findMany({
        where: { postId: { in: postIds }, emoji: "👍" },
        select: { postId: true, userId: true },
      });
      for (const r of reacts) {
        reactionCounts[r.postId] = (reactionCounts[r.postId] || 0) + 1;
        if (r.userId === user.id) reactionMine[r.postId] = true;
      }
    }
  } catch {
    // se não existir o model/relacionamento ainda, apenas não mostra reações
  }

  if (!topic) return <div className="text-white/70">Tópico não encontrado.</div>;

  if (topic.isDeleted) return <div className="text-white/70">Tópico removido.</div>;

  const canModerate = hasAtLeast(user as any, "MODERATOR" as any);
  const canAdmin = hasAtLeast(user as any, "ADMIN" as any);
  const hiddenBoards = canAdmin ? [] : await getJsonArray("forum.hiddenBoards");
  const hiddenTopics = canAdmin ? [] : await getJsonArray("forum.hiddenTopics");
  if (!canAdmin && hiddenBoards.includes(topic.boardId)) return <div className="text-white/70">Tópico não encontrado.</div>;
  if (!canAdmin && hiddenTopics.includes(topic.id)) return <div className="text-white/70">Tópico não encontrado.</div>;


  const isAuthor = topic.authorId === user.id;
  const minutesSinceCreate = (Date.now() - new Date(topic.createdAt).getTime()) / 60000;
  const canSelfDelete = isAuthor && !canAdmin && minutesSinceCreate <= 20;
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/45">
            <Link href="/forum" className="hover:text-white">Fórum</Link> /{" "}
            <Link href={`/forum/board/${topic.boardId}`} className="hover:text-white">{topic.board.name}</Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{topic.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/55">
            <Badge>{topic.status}</Badge>
            {topic.pinned && <Badge>PINNED</Badge>}
            <span>• por {topic.author.username}</span>
            <span>• {topic.posts.length} posts</span>
          </div>
        </div>

        {canModerate && (
          <div className="flex items-center gap-2">
            <form action={`/api/forum/topics/${topic.id}/toggle-lock`} method="post">
              <button className="text-sm underline text-white/70 hover:text-white">
                {topic.status === "OPEN" ? "Trancar (ninguém responde)" : (topic.status === "LOCKED" ? "Trancar (só admin responde)" : "Destrancar")}
              </button>
            </form>
            <form action={`/api/forum/topics/${topic.id}/toggle-pin`} method="post">
              <button className="text-sm underline text-white/70 hover:text-white">
                {topic.pinned ? "Desfixar" : "Fixar"}
              </button>
            </form>
            {canAdmin && (
              <form action={`/api/admin/forum/topics/${topic.id}/delete`} method="post">
                <button className="text-sm underline text-red-200 hover:text-red-100">Apagar tópico</button>
              </form>
            )}

            {canSelfDelete && (
              <form action={`/api/forum/topics/${topic.id}/delete-self`} method="post">
                <button className="text-sm underline text-red-200 hover:text-red-100">Apagar (até 20 min)</button>
              </form>
            )}

            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-white/10">
              <form action={`/api/forum/topics/${topic.id}/move`} method="post">
                <input type="hidden" name="boardId" value="board-analise" />
                <button className="text-sm underline text-white/70 hover:text-white">Iniciar análise</button>
              </form>
              <form action={`/api/forum/topics/${topic.id}/move`} method="post">
                <input type="hidden" name="boardId" value="board-concluidos" />
                <button className="text-sm underline text-white/70 hover:text-white">Concluir</button>
              </form>
              <form action={`/api/forum/topics/${topic.id}/move`} method="post">
                <input type="hidden" name="boardId" value="board-privados" />
                <button className="text-sm underline text-white/70 hover:text-white">Privar</button>
              </form>
            </div>
          </div>
        )}
      </div>

      <Card className="p-5">
        <div className="space-y-5">
          {topic.posts.map((p, idx) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm">
                  <UserHoverLink userId={p.author.id} username={p.author.username} />{" "}
                  <span className="text-white/45">({roleLabel(p.author.role)})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-white/45">{new Date(p.createdAt).toLocaleString("pt-BR")}</div>
                  <PostReactions postId={p.id} initialCount={reactionCounts[p.id] || 0} initialMine={Boolean(reactionMine[p.id])} />
                  {canModerate && !p.isDeleted && (
                    <form action={`/api/admin/forum/posts/${p.id}/delete`} method="post">
                      <button className="text-xs underline text-white/50 hover:text-white/80">Apagar</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-white/75">{p.isDeleted ? "[post removido]" : p.content}</div>
              {!p.isDeleted && (p as any).attachments?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {(p as any).attachments.map((a: any) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="imagem" className="w-full rounded-xl border border-white/10 object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              {!p.isDeleted && p.attachments?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {p.attachments.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="imagem" className="w-full rounded-xl border border-white/10 object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}

            </div>
          ))}
        </div>
      </Card>

      <ReplyBox topicId={topic.id} authed={Boolean(user)} canReply={topic.status === "OPEN" || (topic.status === "LOCKED_ADMIN" && hasAtLeast(user, "ADMIN"))} lockedMessage={topic.status === "LOCKED_ADMIN" ? "Apenas administradores podem responder neste tópico." : (topic.status === "LOCKED" ? "Este tópico está trancado." : null)} />
    </div>
  );
}