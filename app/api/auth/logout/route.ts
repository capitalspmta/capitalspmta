import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  clearSessionCookie();
  await audit("auth.logout", "User", null);
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
