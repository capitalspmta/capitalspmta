import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { requireActiveUser } from "@/lib/guards";
import { hasAtLeast } from "@/lib/rbac";
import { getJsonArray } from "@/lib/settings";

export default async function ForumHome() {
  const user = await requireActiveUser();
  const isAdmin = hasAtLeast(user as any, "ADMIN" as any);
  const hiddenBoards = isAdmin ? [] : await getJsonArray("forum.hiddenBoards");
  const categoriesRaw = await prisma.forumCategory.findMany({
    orderBy: { order: "asc" },
    include: { boards: { orderBy: { order: "asc" }, include: { _count: { select: { topics: true } } } } },
  });

  const categories = categoriesRaw.map((c) => ({ ...c, boards: c.boards.filter((b: any) => !hiddenBoards.includes(b.id)) })).filter((c: any) => isAdmin || c.boards.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fórum</h1>
          <p className="mt-1 text-sm text-white/55">Categorias e tópicos, com moderação (trancar/fixar).</p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/85 font-semibold">Categorias</span>
          <span className="text-white/35">•</span>
          <Link href="/forum/ranking" className="text-white/70 hover:text-white underline">Ranking</Link>
        </div>

        {user ? (
          <Link href="/forum/new" className="text-sm text-white underline hover:text-white/90">
            Criar tópico
          </Link>
        ) : (
          <Link href="/auth/login" className="text-sm text-white underline hover:text-white/90">
            Entrar para postar
          </Link>
        )}
      </div>

      {categories.map((cat) => (
        <Card key={cat.id} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">{cat.name}</div>
              {cat.description && <div className="text-sm text-white/50 mt-1">{cat.description}</div>}
            </div>
            <Badge>{cat.boards.length} boards</Badge>
          </div>

          <div className="mt-4 divide-y divide-white/10">
            {cat.boards.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link href={`/forum/board/${b.id}`} className="font-medium text-white/85 hover:text-white">
                    {b.name}
                  </Link>
                  {b.description && <div className="text-sm text-white/45">{b.description}</div>}
                </div>
                <div className="text-sm text-white/55">{b._count.topics} tópicos</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
