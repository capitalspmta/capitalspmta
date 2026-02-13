import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { setSetting } from "@/lib/settings";

const schema = z.object({
  accessToken: z.string().min(20).max(400),
});

export async function POST(req: Request) {
  const user = await requireRole("OWNER");
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Token inválido." }, { status: 400 });

  await setSetting("mp_access_token", parsed.data.accessToken.trim());
  await audit("settings.mp.update", "SiteSetting", "mp_access_token", { actor: user.id, length: parsed.data.accessToken.length });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await requireRole("OWNER");
  const { getSetting } = await import("@/lib/settings");
  const v = await getSetting("mp_access_token");
  const masked = v ? `${v.slice(0,6)}...${v.slice(-4)}` : null;
  return NextResponse.json({ hasToken: !!v, masked });
}
