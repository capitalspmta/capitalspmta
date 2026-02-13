import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serial = url.searchParams.get("serial");
  const token = url.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token !== process.env.MTA_API_TOKEN) return unauthorized();
  if (!serial) return NextResponse.json({ allowed: false, reason: "missing_serial" }, { status: 400 });

  const account = await prisma.gameAccount.findFirst({
    where: { mtaSerial: serial },
    include: { user: { select: { id: true, role: true, bannedUntil: true, whitelistStatus: true } } },
  });

  if (!account) {
    await prisma.mtaAccessLog.create({ data: { serial, allowed: false, reason: "unknown_serial" } });
    return NextResponse.json({ allowed: false, reason: "unknown_serial" });
  }

  const user = account.user;
  const now = new Date();

  if (user.bannedUntil && user.bannedUntil > now) {
    await prisma.mtaAccessLog.create({ data: { serial, userId: user.id, allowed: false, reason: "banned" } });
    return NextResponse.json({ allowed: false, reason: "banned" });
  }

  if (user.whitelistStatus !== "APPROVED") {
    await prisma.mtaAccessLog.create({ data: { serial, userId: user.id, allowed: false, reason: "not_whitelisted" } });
    return NextResponse.json({ allowed: false, reason: "not_whitelisted" });
  }

  await prisma.mtaAccessLog.create({ data: { serial, userId: user.id, allowed: true } });
  return NextResponse.json({ allowed: true, userId: user.id });
}
