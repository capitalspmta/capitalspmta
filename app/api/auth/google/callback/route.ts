import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const expected = cookies().get("g_oauth_state")?.value || "";

  if (!code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/auth/login?google=invalid", url.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/auth/login?google=missing", url.origin));
  }

  // Exchange code -> tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/auth/login?google=failed", url.origin));
  }

  const tokens = await tokenRes.json() as any;
  const accessToken = tokens.access_token as string;

  // Fetch profile
  const meRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    return NextResponse.redirect(new URL("/auth/login?google=failed", url.origin));
  }

  const me = await meRes.json() as any;
  const googleId = String(me.sub || "");
  const email = String(me.email || "").toLowerCase();
  const name = String(me.name || "").trim();
  const preferredUsername = (name || email.split("@")[0] || "user")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .slice(0, 24);

  if (!googleId || !email) {
    return NextResponse.redirect(new URL("/auth/login?google=failed", url.origin));
  }

  // Find or create user
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
    select: { id: true, username: true, role: true, whitelistStatus: true },
  });

  if (!user) {
    // Ensure username unique
    let username = preferredUsername || "user";
    for (let i = 0; i < 50; i++) {
      const exists = await prisma.user.findFirst({ where: { username }, select: { id: true } });
      if (!exists) break;
      username = `${preferredUsername}_${i+1}`.slice(0, 24);
    }

    user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: "GOOGLE_OAUTH",
        googleId,
        emailVerifiedAt: new Date(),
        whitelistStatus: "PENDING",
        role: "USER",
      },
      select: { id: true, username: true, role: true, whitelistStatus: true },
    });

    await audit("auth.google_register", "User", user.id, { username: user.username });
  } else {
    // Link googleId if missing
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId, emailVerifiedAt: new Date() },
    }).catch(() => {});
    await audit("auth.google_login", "User", user.id, {});
  }

  // Create session cookie
  await createSessionCookie({
    id: user.id,
    email,
    username: user.username,
    role: user.role,
    whitelistStatus: user.whitelistStatus,
  } as any);

  const dest = user.whitelistStatus === "APPROVED" ? "/forum" : "/whitelist";
  return NextResponse.redirect(new URL(dest, url.origin));
}
