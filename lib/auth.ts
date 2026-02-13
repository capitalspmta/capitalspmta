import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import type { RoleName } from "./rbac";

const COOKIE_NAME = "session";
const enc = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado.");
  return enc.encode(secret);
}

export type SafeUser = { id: string; email: string; username: string; role: string; avatarKey?: string; discordId?: string | null; discordUsername?: string | null; whitelistStatus?: string; bannedUntil?: string | null };

export async function createSessionCookie(user: SafeUser) {
  const jwt = await new SignJWT({
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    whitelistStatus: (user as any).whitelistStatus ?? "APPROVED",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  cookies().set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = String(payload.sub || "");
    if (!userId) return null;

    // Revalida no banco (permite mudar role / invalidar conta)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, role: true, avatarKey: true, discordId: true, discordUsername: true, whitelistStatus: true, bannedUntil: true, isDeleted: true, lastSeenAt: true },
    });
    if (!user || user.isDeleted) return null;

    // Atualiza lastSeenAt (para "Usuários online"). Throttle simples.
    try {
      const last = (user as any).lastSeenAt ? new Date((user as any).lastSeenAt) : null;
      const tooOld = !last || Date.now() - last.getTime() > 60_000;
      if (tooOld) {
        await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
      }
    } catch {
      // best-effort
    }

    return { id: user.id, email: user.email, username: user.username, role: user.role, whitelistStatus: (user as any).whitelistStatus, bannedUntil: user.bannedUntil ? user.bannedUntil.toISOString() : null };
  } catch {
    return null;
  }
}

export function getRequestMeta() {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent") || null;
  return { ip, userAgent };
}


export async function requireUserApi() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRoleApi(minRole: RoleName) {
  const user = await requireUserApi();
  const { hasAtLeast } = await import("./rbac");
  if (!hasAtLeast(user, minRole)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function requireRole(minRole: RoleName) {
  const user = await requireUser();
  const { hasAtLeast } = await import("./rbac");
  if (!hasAtLeast(user, minRole)) {
    // UX profissional: não quebra a página
    redirect(`/forbidden?need=${encodeURIComponent(minRole)}`);
  }
  return user;
}