import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
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

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Envie um arquivo (file)." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Apenas imagens são permitidas." }, { status: 400 });
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ message: "Imagem muito grande (máx 5MB)." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", user.id);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${safeName(file.name || "image")}`;
  const full = path.join(dir, filename);
  await fs.writeFile(full, bytes);

  const url = `/uploads/${user.id}/${filename}`;
  await audit("upload.image", "Upload", url, { url, size: file.size, type: file.type });

  return NextResponse.json({ url, mime: file.type, size: file.size });
}
