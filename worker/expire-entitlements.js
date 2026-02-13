const { getPrismaClient } = require("../prisma/runtime-client.cjs");
const PrismaClient = getPrismaClient();
const prisma = new PrismaClient();

async function runOnce() {
  const now = new Date();
  const exps = await prisma.entitlement.findMany({
    where: { expiresAt: { lte: now } },
    select: { id: true, userId: true, roleName: true },
    take: 500,
  });

  for (const e of exps) {
    const role = await prisma.role.findUnique({ where: { name: e.roleName }, select: { id: true } });
    if (role) {
      await prisma.userRole.deleteMany({ where: { userId: e.userId, roleId: role.id } });
    }
    await prisma.entitlement.delete({ where: { id: e.id } });
  }

  await prisma.adminCase.updateMany({
    where: { type: "BAN", active: true, expiresAt: { lte: now } },
    data: { active: false },
  });

  const stillBanned = await prisma.adminCase.findMany({
    where: { type: "BAN", active: true },
    select: { targetUserId: true },
  });
  const bannedIds = new Set(stillBanned.map(b => b.targetUserId));
  const usersWithBan = await prisma.user.findMany({ where: { bannedUntil: { not: null } }, select: { id: true } });
  for (const u of usersWithBan) {
    if (!bannedIds.has(u.id)) {
      await prisma.user.update({ where: { id: u.id }, data: { bannedUntil: null } }).catch(() => {});
    }
  }
}

async function loop() {
  for (;;) {
    try {
      await runOnce();
    } catch (e) {
      console.error("[worker] error", e);
    }
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

loop().finally(() => prisma.$disconnect());
