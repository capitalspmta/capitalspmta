const { execSync } = require('child_process');
const { getActiveSchemaPath, getDatabaseUrl, isSqlite } = require('./prisma-schema.cjs');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const url = getDatabaseUrl();
const schema = getActiveSchemaPath();
console.log(`[db] DATABASE_URL=${url || '(vazio)'} -> ${isSqlite(url) || !url ? 'sqlite' : 'postgres'}`);
console.log(`[db] schema: ${schema}`);

run(`npx prisma db push --schema ${schema}`);
