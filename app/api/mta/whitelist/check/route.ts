import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SHARED_SECRET = process.env.MTA_SHARED_SECRET || "DEV_LOCAL_SECRET_123456";

type Payload = { serial?: string; ip?: string; nick?: string; token?: string };

export async function POST(req: Request) {
  const form = await req.formData();
  const raw = form.get("payload");
  if (!raw || typeof raw !== "string") return NextResponse.json({ allowed: false, message: "Payload inválido." });

  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ allowed: false, message: "JSON inválido." });
  }

  if (!payload.serial || !payload.token || payload.token !== SHARED_SECRET) {
    return NextResponse.json({ allowed: false, message: "Token inválido." });
  }

  const user = await prisma.user.findFirst({
    where: { mtaSerial: payload.serial, isDeleted: false },
    select: { id: true, bannedUntil: true }
  });

  if (!user) {
    const link = `http://localhost:3000/mta/link?serial=${encodeURIComponent(payload.serial)}`;
    return NextResponse.json({
      allowed: false,
      status: "NOT_LINKED",
      message: `Conta não vinculada. Faça login no site e abra: ${link}`
    });
  }

  // Ban optional
  if (user.bannedUntil) {
    const until = new Date(user.bannedUntil).toISOString().slice(0, 19).replace("T", " ");
    return NextResponse.json({
      allowed: false,
      status: "BANNED",
      message: `Você está banido até ${until}.`
    });
  }

  const wl = await prisma.whitelistApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true, rejectReason: true }
  });

  if (!wl) {
    return NextResponse.json({
      allowed: false,
      status: "NO_WHITELIST",
      message: "Você ainda não fez whitelist no site."
    });
  }

  if (wl.status !== "APPROVED") {
    if (wl.status === "PENDING") {
      return NextResponse.json({
        allowed: false,
        status: "PENDING",
        message: "Sua whitelist está em análise."
      });
    }
    return NextResponse.json({
      allowed: false,
      status: "REJECTED",
      message: wl.rejectReason ? `Whitelist recusada: ${wl.rejectReason}` : "Sua whitelist foi recusada."
    });
  }


  // ACLs vinculadas a produtos pagos (opcional). O script do MTA pode aplicar idempotentemente.
  const paid = await prisma.purchase.findMany({
    where: { userId: user.id, status: "PAID" },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const paidIds = paid.map((p) => p.id);
  let aclGroups: string[] = [];
  if (paidIds.length) {
    const items = await prisma.purchaseItem.findMany({
      where: { purchaseId: { in: paidIds } },
      select: { mtaActions: true },
      take: 200,
    });

    const set = new Set<string>();
    for (const it of items) {
      const raw: any = (it as any).mtaActions;
      let a: any = null;
      if (typeof raw === "string") {
        try { a = JSON.parse(raw); } catch { a = null; }
      } else if (raw && typeof raw === "object") {
        a = raw;
      }
      if (Array.isArray(a)) {
        for (const e of a) {
          const g = e && typeof e === "object" ? (e.aclGroup || e.acl || e.aclName || e.group) : null;
          if (typeof g === "string" && g.trim()) set.add(g.trim());
        }
      } else {
        const g = a && typeof a === "object" ? (a.aclGroup || a.acl || a.aclName || a.group) : null;
        if (typeof g === "string" && g.trim()) set.add(g.trim());
      }
    }
    aclGroups = Array.from(set);
  }

  return NextResponse.json({ allowed: true, status: "APPROVED", aclGroups });
}
