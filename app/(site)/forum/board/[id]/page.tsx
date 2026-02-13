import Link from "next/link";
import UserHoverLink from "@/components/UserHoverLink";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { requireActiveUser } from "@/lib/guards";
import { hasAtLeast } from "@/lib/rbac";
import { getJsonArray } from "@/lib/settings";

export default async function BoardPage({ params }: { params: { id: string } }) {
  const user = await requireActiveUser();
  const isAdmin = hasAtLeast(user as any, "ADMIN" as any);
  const hiddenBoards = isAdmin ? [] : await getJsonArray("forum.hiddenBoards");
  const hiddenTopics = isAdmin ? [] : await getJsonArray("forum.hiddenTopics");

  const board = await prisma.forumBoard.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      topics: {
        orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
        include: { author: { select: { username: true } }, _count: { select: { posts: true } } },
        take: 50,
      },
    },
  });

  if (!board) return <div className="text-white/70">Board não encontrada.</div>;
  if (!isAdmin && hiddenBoards.includes(board.id)) return <div className="text-white/70">Board não encontrada.</div>;

  const topics = isAdmin ? board.topics : board.topics.filter((t: any) => !hiddenTopics.includes(t.id));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-white/45">{board.category.name} / Board</div>
        <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
        {board.description && <p className="mt-1 text-sm text-white/55">{board.description}</p>}
      </div>

      <Card className="p-5">
        <div className="divide-y divide-white/10">
          {topics.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <Link href={`/forum/topic/${t.id}`} className="font-medium text-white/85 hover:text-white">
                  {t.pinned ? "📌 " : ""}{t.title}
                </Link>
                <div className="text-xs text-white/45 mt-1">
                  por {t.author.username} • {t.status === "LOCKED" ? "Trancado" : "Aberto"}
                </div>
              </div>
              <div className="text-sm text-white/55 flex items-center gap-3">
                <Badge>{t._count.posts} posts</Badge>
              </div>
            </div>
          ))}
          {topics.length === 0 && <div className="py-6 text-sm text-white/55">Sem tópicos ainda.</div>}
        </div>
      </Card>
    </div>
  );
}
