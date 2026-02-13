import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";

export default async function DeletedPostsPage() {
  await requireRole("MODERATOR");

  const posts = await prisma.post.findMany({
    where: { isDeleted: true },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { id: true, username: true } }, topic: { select: { id: true, title: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Conteúdo removido</h1>
        <p className="mt-1 text-sm text-white/55">Mensagens apagadas do fórum (arquivo). Apenas staff.</p>
      </div>

      <Card className="p-5">
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-sm text-white/60">Nenhuma mensagem removida ainda.</div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Autor: {p.author?.username ?? "—"}</Badge>
                  <Badge>Atualizado: {new Date(p.updatedAt).toLocaleString()}</Badge>
                  <Link className="text-sm text-white/80 hover:underline" href={`/forum/topic/${p.topicId}`}>
                    Ver tópico: {p.topic?.title ?? p.topicId}
                  </Link>
                </div>
                <div className="text-sm text-white/80 whitespace-pre-wrap">{p.content}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
