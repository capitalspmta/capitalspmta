const fs = require("fs");
const path = require("path");

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

/**
 * IMPORTANTE (deploy):
 * Em plataformas como Vercel/Render/Fly, as variáveis de ambiente devem ser
 * configuradas no painel do provedor. Criar um .env automaticamente no build
 * pode causar confusão (ex.: DATABASE_URL apontando para localhost).
 *
 * Por isso, só criamos .env automaticamente quando:
 *  - não estamos em produção/CI e
 *  - não há DATABASE_URL no ambiente e
 *  - .env não existe.
 */
const isCI = Boolean(process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS);
const isProd = process.env.NODE_ENV === "production";

if (fs.existsSync(envPath)) {
  console.log("[setup] .env já existe");
  process.exit(0);
}

if (isProd || isCI || process.env.DATABASE_URL) {
  console.log("[setup] pulando criação do .env (deploy/CI ou vars já definidas)");
  process.exit(0);
}

if (fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("[setup] .env criado a partir de .env.example");
} else {
  console.warn("[setup] .env.example não encontrado; crie um .env manualmente.");
}
