import { prisma } from "./prisma";
import { normalizeRoleName } from "./rbac";
import { hasAtLeast } from "./rbac";
import type { SafeUser } from "./auth";

/**
 * Permissões:
 * - Para manter simples e robusto, usamos:
 *   1) rank por user.role (USER/SUPPORT/MODERATOR/ADMIN/OWNER)
 *   2) permissões extras via tabelas Role/Permission/UserRole (gerenciáveis no painel)
 */
const builtIn: Record<string, string[]> = {
  SUPPORT: ["ticket.view.all"],
  MODERATOR: ["ticket.view.all", "forum.topic.lock", "forum.topic.pin", "forum.post.delete", "ticket.message.delete"],
  ADMIN: [
    "ticket.view.all",
    "forum.topic.lock",
    "forum.topic.pin",
    "forum.post.delete",
    "forum.topic.delete",
    "ticket.delete",
    "ticket.message.delete",
    "user.manage",
    "purchase.manage",
    "whitelist.manage",
    "badge.manage",
    "points.manage",
  ],
  OWNER: ["*"],
};

export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  const s = new Set<string>();
  if (!u) return s;

    const builtin = builtIn[normalizeRoleName(u.role)] ?? [];
  for (const k of builtin) s.add(k);

  for (const ur of u.userRoles) {
    for (const rp of ur.role.permissions) {
      s.add(rp.permission.key);
    }
  }
  return s;
}

export async function hasPermission(user: SafeUser | null | undefined, permissionKey: string): Promise<boolean> {
  if (!user) return false;
  if (hasAtLeast(user, "OWNER")) return true;

    const builtin = builtIn[normalizeRoleName(user.role)] ?? [];
  if (builtin.includes("*") || builtin.includes(permissionKey)) return true;

  const keys = await getUserPermissionKeys(user.id);
  return keys.has(permissionKey);
}

export async function requirePermission(user: SafeUser | null | undefined, permissionKey: string) {
  const ok = await hasPermission(user, permissionKey);
  if (!ok) throw new Error("FORBIDDEN");
}
