export const ROLE_LABEL: Record<string, string> = {
  OWNER: "CEO",
  ADMIN: "Supervisão",
  MODERATOR: "Administração",
  SUPPORT: "STAFF",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "";
  return ROLE_LABEL[role] ?? role;
}
