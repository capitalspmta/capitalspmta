import { prisma } from "@/lib/prisma";

/**
 * Resolve a boardId.
 * Supports real board IDs (cuid) and "system tokens" used in UI/actions:
 *  - board-analise    -> "Em analise"
 *  - board-concluidos -> "Concluidos"
 *  - board-privados   -> "Privados"
 *  - board-lixeira    -> "Lixeira"
 *
 * If the target board does not exist, it is created under a "Sistema" category.
 */
function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM_MAP: Record<string, string> = {
  "board-analise": "Em analise",
  "board-concluidos": "Concluidos",
  "board-privados": "Privados",
  "board-lixeira": "Lixeira",
};

async function ensureSystemCategoryId(): Promise<string> {
  const desired = "Sistema";
  const cats = await prisma.forumCategory.findMany({ select: { id: true, name: true }, orderBy: { order: "asc" } });
  const found = cats.find((c) => normalizeName(c.name) === normalizeName(desired));
  if (found) return found.id;

  const created = await prisma.forumCategory.create({
    data: { name: desired, description: "Boards do sistema/moderação", order: 9999 },
    select: { id: true },
  });
  return created.id;
}

async function ensureBoardByName(name: string): Promise<string> {
  const boards = await prisma.forumBoard.findMany({ select: { id: true, name: true, categoryId: true }, orderBy: { order: "asc" } });
  const n = normalizeName(name);
  const found = boards.find((b) => normalizeName(b.name) === n);
  if (found) return found.id;

  const categoryId = await ensureSystemCategoryId();
  const created = await prisma.forumBoard.create({
    data: {
      categoryId,
      name,
      description: "Board automático (sistema).",
      order: 9999,
      requireWhitelist: false,
      allowReplies: true,
      pointsOnTopic: 0,
      pointsOnReply: 0,
    },
    select: { id: true },
  });
  return created.id;
}

export async function resolveBoardId(input: string): Promise<string | null> {
  const token = (input || "").trim();
  if (!token) return null;

  const mappedName = SYSTEM_MAP[token.toLowerCase()];
  if (mappedName) return await ensureBoardByName(mappedName);

  // Try direct ID: verify it exists to avoid foreign key errors / silent failures.
  const exists = await prisma.forumBoard.findUnique({ where: { id: token }, select: { id: true } });
  if (exists) return exists.id;

  // Also allow passing a board name directly (e.g. "Lixeira")
  const boards = await prisma.forumBoard.findMany({ select: { id: true, name: true } });
  const found = boards.find((b) => normalizeName(b.name) === normalizeName(token));
  if (found) return found.id;

  return null;
}
