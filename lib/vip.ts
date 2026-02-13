
import { prisma } from "./prisma";

export async function ensureUserHasRole(userId: string, roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName }, select: { id: true } });
  if (!role) return;
  const exists = await prisma.userRole.findFirst({ where: { userId, roleId: role.id } });
  if (exists) return;
  await prisma.userRole.create({ data: { userId, roleId: role.id } });
}

export function vipRoleFromSku(sku: string): string | null {
  if (sku === "vip-apoiador") return "APOIADOR";
  if (sku === "vip-investidor") return "INVESTIDOR";
  if (sku === "vip-patrocinador") return "PATROCINADOR";
  return null;
}
