export type RoleName = "USER" | "SUPPORT" | "MODERATOR" | "ADMIN" | "OWNER";

export const roleRank: Record<RoleName, number> = {
  USER: 1,
  SUPPORT: 2,
  MODERATOR: 3,
  ADMIN: 4,
  OWNER: 5,
};

// Normaliza nomes exibidos (pt-br) para os nomes internos do RBAC.
// Mantém compatibilidade com bancos onde o usuário tenha `role` salvo como texto customizado.
export function normalizeRoleName(role: string | null | undefined): RoleName | string {
  const raw = String(role || "").trim();
  const upper = raw.toUpperCase();
  const map: Record<string, RoleName> = {
    "CEO": "OWNER",
    "SUPERVISÃO": "ADMIN",
    "SUPERVISAO": "ADMIN",
    "ADMINISTRAÇÃO": "MODERATOR",
    "ADMINISTRACAO": "MODERATOR",
    "STAFF": "SUPPORT",
  };
  return map[upper] ?? upper;
}

export function hasAtLeast(user: { role: string } | null | undefined, minRole: RoleName): boolean {
  if (!user) return false;
  const normalized = normalizeRoleName(user.role);
  const r = (roleRank as any)[normalized as any] ?? 0;
  return r >= roleRank[minRole];
}

export function getRank(role: string | null | undefined): number {
  const normalized = normalizeRoleName(role);
  return (roleRank as any)[normalized as any] ?? 0;
}

// Regra de hierarquia: um ator só pode aplicar ações administrativas em alvos com rank MENOR.
// Ex.: MODERATOR não mexe em ADMIN/OWNER; ADMIN não mexe em OWNER.
export function canManageUser(actor: { role: string } | null | undefined, target: { role: string } | null | undefined): boolean {
  if (!actor || !target) return false;
  const ar = getRank(actor.role);
  const tr = getRank(target.role);
  // Regra solicitada: OWNER não deve ser limitado (pode gerenciar até outros OWNER).
  if (ar >= roleRank.OWNER) return true;
  return ar > tr;
}
