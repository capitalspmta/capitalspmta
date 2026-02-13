import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const enc = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return enc.encode(secret);
}

async function getUserRoleFromCookie(req: NextRequest): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).role ?? null;
  } catch {
    return null;
  }
}

const protectedPaths = ["/tickets", "/store", "/account", "/admin", "/forum/new", "/whitelist", "/blocked"];
const rank: Record<string, number> = { USER: 1, SUPPORT: 2, MODERATOR: 3, ADMIN: 4, OWNER: 5 };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const role = await getUserRoleFromCookie(req);
  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Staff-only areas:
  if (pathname.startsWith("/admin")) {
    const need =
      pathname.startsWith("/admin/tickets") || pathname.startsWith("/admin/purchases") || pathname.startsWith("/admin/whitelist")
        ? "SUPPORT"
        : pathname.startsWith("/admin/staff")
        ? "SUPPORT"
        : pathname.startsWith("/admin/logs")
        ? "MODERATOR"
        : pathname.startsWith("/admin/users") || pathname.startsWith("/admin/forum")
        ? "ADMIN"
        : "MODERATOR";

    if ((rank[role] ?? 0) < rank[need]) {
      const url = req.nextUrl.clone();
      url.pathname = "/forum";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tickets/:path*", "/store/:path*", "/account/:path*", "/admin/:path*", "/forum/new", "/whitelist", "/blocked"],
};
