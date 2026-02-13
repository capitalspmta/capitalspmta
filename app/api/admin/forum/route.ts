import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJsonArray } from "@/lib/settings";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const categoriesRaw = await prisma.forumCategory.findMany({ orderBy: { order: "asc" } });
    const lockRows = await prisma.siteSetting.findMany({
      where: { key: { startsWith: "forum.category.locked." } },
      select: { key: true, value: true },
    });
    const lockedMap = new Map(lockRows.map(r => [r.key.replace("forum.category.locked.", ""), r.value === "1"]));
    const categories = categoriesRaw.map((c) => ({ ...c, lockedAdminOnly: Boolean(lockedMap.get(c.id)) }));
    const boards = await prisma.forumBoard.findMany({ orderBy: { createdAt: "desc" } });
    const hiddenBoards = await getJsonArray("forum.hiddenBoards");
    const hiddenTopics = await getJsonArray("forum.hiddenTopics");
    return NextResponse.json({ categories, boards, hiddenBoards, hiddenTopics });
  } catch {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
}
