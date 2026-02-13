const { execSync } = require('child_process');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

// Gera os 2 Prisma Clients:
// - SQLite para rodar local sem dependências
// - Postgres para produção
run('npx prisma generate --schema prisma/schema.sqlite.prisma');
run('npx prisma generate --schema prisma/schema.postgres.prisma');
