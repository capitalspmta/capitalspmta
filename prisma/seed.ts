import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed inicial:
 * - Cria cargos base (sem campo category; compatível com SQLite client gerado)
 * - Cria a conta OWNER padrão (cronos)
 * - Não cria produtos nem compras
 */
const prisma = new PrismaClient();

async function main() {
  const roles = [
    { name: "SUPPORT", rank: 30, description: "Cargo: Suporte" },
    { name: "MODERATOR", rank: 31, description: "Cargo: Moderador" },
    { name: "ADMIN", rank: 32, description: "Cargo: Administrador" },
    { name: "OWNER", rank: 33, description: "Cargo: Owner" },
    { name: "APOIADOR", rank: 10, description: "VIP Apoiador" },
    { name: "INVESTIDOR", rank: 11, description: "VIP Investidor" },
    { name: "PATROCINADOR", rank: 12, description: "VIP Patrocinador" },
    { name: "STAFF_SEMANAL", rank: 20, description: "Recompensa semanal de staff" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { rank: r.rank, description: r.description },
      create: r,
    });
  }

  // OWNER padrão
  const ownerEmail = "cronosMTA@gmail.com";
  const ownerUsername = "cronos";
  const ownerPassword = "@Edjanemiguel2715";

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      username: ownerUsername,
      passwordHash,
      role: "OWNER",
      whitelistStatus: "APPROVED",
      // Permite login imediato sem fluxo de verificação
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
    },
    create: {
      email: ownerEmail,
      username: ownerUsername,
      passwordHash,
      role: "OWNER",
      whitelistStatus: "APPROVED",
      avatarKey: "avatar1",
      // Permite login imediato sem fluxo de verificação
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
    },
  });

  // Whitelist config singleton
  await prisma.whitelistConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Seed OK (OWNER criado; sem produtos/compras).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
