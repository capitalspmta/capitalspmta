// Usa Prisma Client correto conforme o DATABASE_URL:
// - file:... => SQLite (local)
// - caso contrário => Postgres (produção)
// Import dinâmico porque geramos dois clients com outputs diferentes.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = (() => {
  const url = (process.env.DATABASE_URL || "").trim();
  const isSqlite = !url || url.startsWith("file:") || url.startsWith("sqlite:");
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return isSqlite ? require("../prisma/generated/sqlite") : require("../prisma/generated/postgres");
})();

declare global {
  // eslint-disable-next-line no-var
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
