const { execSync } = require('child_process');
const { getActiveSchemaPath, getDatabaseUrl, isSqlite } = require('./prisma-schema.cjs');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

const url = getDatabaseUrl();
const schema = getActiveSchemaPath();
const mode = isSqlite(url) || !url ? 'sqlite' : 'postgres';
console.log(`[setup] DB mode: ${mode}`);
console.log(`[setup] schema: ${schema}`);

run(`npx prisma db push --schema ${schema}`);
run('node prisma/seed.js');
