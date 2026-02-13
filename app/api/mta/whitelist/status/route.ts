import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMtaKey } from "@/lib/mta-auth";

export async function GET(req: Request) {
  const auth = requireMtaKey(req);
  if (auth) return auth;

  try {
    const { searchParams } = new URL(req.url);
    // Normalize serial: MTA usually sends uppercase, but users may have linked with different casing.
    const serial = (searchParams.get("serial") || "").trim().toUpperCase();
    const ip = searchParams.get("ip");
    const nickname = searchParams.get("nickname");

    if (!serial) {
      return NextResponse.json(
        { allowed: false, status: "INVALID", reason: "Serial ausente." },
        { status: 400 }
      );
    }

    let ga: any = null;
    try {
      // Some users end up saving a truncated serial (e.g. 31 chars). To be resilient,
      // we try an exact match first and then a prefix match against common truncation lengths.
      const s31 = serial.length > 31 ? serial.slice(0, 31) : serial;
      const s30 = serial.length > 30 ? serial.slice(0, 30) : serial;

      ga = await prisma.gameAccount.findFirst({
        where: {
          OR: [{ mtaSerial: serial }, { mtaSerial: s31 }, { mtaSerial: s30 }],
        },
        include: { user: true },
      });

      // Auto-heal: if we found a record saved with a truncated prefix, upgrade it to the full serial.
      // This keeps the unique constraint intact; if it conflicts, we keep the old value.
      if (ga?.mtaSerial && ga.mtaSerial !== serial && serial.startsWith(String(ga.mtaSerial).toUpperCase())) {
        try {
          await prisma.gameAccount.update({
            where: { id: ga.id },
            data: { mtaSerial: serial },
          });
          ga.mtaSerial = serial;
        } catch (e) {
          console.warn("[MTA][WL] auto-heal serial skipped:", e);
        }
      }
    } catch (e) {
      console.error("[MTA][WL] gameAccount query failed:", e);
    }

    let allowed = false;
    let status = "UNLINKED";
    let reason: string | null = "Serial não vinculado.";

    if (ga?.user) {
      const u: any = ga.user;
      const ws = String(u.whitelistStatus || "PENDING").toUpperCase();
      status = ws;

      if (ws === "APPROVED") {
        allowed = true;
        reason = null;
      } else if (ws === "REJECTED") {
        allowed = false;
        reason = "Whitelist negada.";
      } else {
        allowed = false;
        reason = "Whitelist pendente.";
      }
    }

    try {
      await prisma.mtaAccessLog.create({
        data: {
          serial,
          allowed,
          reason,
          ip: ip || null,
          ...(ga?.userId ? { user: { connect: { id: ga.userId } } } : {}),
        },
      });
    } catch (e) {
      console.error("[MTA][WL] access log failed:", e);
    }

    return NextResponse.json({ allowed, status, reason });
  } catch (e: any) {
    console.error("[MTA][WL] FATAL:", e);
    return NextResponse.json(
      {
        allowed: false,
        status: "ERROR",
        reason: "Erro interno",
        detail: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}
