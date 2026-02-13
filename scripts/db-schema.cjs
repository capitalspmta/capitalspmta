function getDbKind() {
  const url = process.env.DATABASE_URL || '';
  if (url.trim().toLowerCase().startsWith('file:')) return 'sqlite';
  // Prisma aceita "postgresql://" e "postgres://"; tratamos ambos como Postgres
  return 'postgres';
}

function getSchemaPath() {
  return getDbKind() === 'sqlite'
    ? 'prisma/schema.sqlite.prisma'
    : 'prisma/schema.postgres.prisma';
}

module.exports = { getDbKind, getSchemaPath };
