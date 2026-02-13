
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const KEY = "terms_markdown";

export async function GET() {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  return NextResponse.json({ markdown: row?.value || "" });
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  await requirePermission(user, "*"); // OWNER via built-in
  let markdown = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await req.json().catch(() => null);
    markdown = String(body?.markdown || "");
  } else {
    const form = await req.formData().catch(() => null as any);
    markdown = form?.get("markdown") ? String(form.get("markdown")) : "";
  }
  await prisma.siteSetting.upsert({
    where: { key: KEY },
    update: { value: markdown },
    create: { key: KEY, value: markdown },
  });
  await audit("settings.terms.update", "SiteSetting", "terms_markdown", { len: markdown.length });
  return NextResponse.json({ ok: true });
}
