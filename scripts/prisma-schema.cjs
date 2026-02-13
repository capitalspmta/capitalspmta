function getDatabaseUrl() {
  return (process.env.DATABASE_URL || '').trim();
}

function isSqlite(url) {
  return url.startsWith('file:') || url.startsWith('sqlite:');
}

function getActiveSchemaPath() {
  const url = getDatabaseUrl();
  // Se nÃ£o tiver DATABASE_URL, assumimos SQLite para rodar local.
  if (!url || isSqlite(url)) return 'prisma/schema.sqlite.prisma';
  return 'prisma/schema.postgres.prisma';
}

module.exports = { getDatabaseUrl, isSqlite, getActiveSchemaPath };
