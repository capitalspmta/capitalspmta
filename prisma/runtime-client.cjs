function getDatabaseUrl() {
  return (process.env.DATABASE_URL || '').trim();
}

function isSqlite(url) {
  return url.startsWith('file:') || url.startsWith('sqlite:') || !url;
}

function getClientModulePath() {
  const url = getDatabaseUrl();
  return isSqlite(url) ? './generated/sqlite' : './generated/postgres';
}

function getPrismaClient() {
  const modulePath = getClientModulePath();
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const mod = require(modulePath);
  return mod.PrismaClient;
}

module.exports = { getPrismaClient, getClientModulePath, isSqlite, getDatabaseUrl };
