
import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "Envie um arquivo (file)." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ message: "Apenas imagens." }, { status: 400 });
  const maxBytes = 3 * 1024 * 1024;
  if (file.size > maxBytes) return NextResponse.json({ message: "Imagem muito grande (máx 3MB)." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "avatars", user.id);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safeName(file.name || "avatar")}`;
  await fs.writeFile(path.join(dir, filename), bytes);

  const url = `/uploads/avatars/${user.id}/${filename}`;
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url } });
  await audit("account.avatar.upload", "User", user.id, { url });

  return NextResponse.json({ url });
}
