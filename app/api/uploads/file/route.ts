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

  const maxBytes = 50 * 1024 * 1024; // 50MB (prints/videos curtos)
  if (file.size > maxBytes) {
    return NextResponse.json({ message: "Arquivo muito grande (máx 50MB)." }, { status: 400 });
  }

  const ext = path.extname(file.name) || "";
  const base = safeName(path.basename(file.name, ext)).slice(0, 60) || "upload";
  const stamp = Date.now();
  const rand = Math.random().toString(16).slice(2, 8);
  const filename = `${base}_${stamp}_${rand}${safeName(ext)}`;

  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);

  const dir = path.join(process.cwd(), "public", "uploads", "files");
  await fs.mkdir(dir, { recursive: true });
  const full = path.join(dir, filename);
  await fs.writeFile(full, buf);

  const url = `/uploads/files/${filename}`;

  await audit("upload.file", "Upload", url, { url, name: file.name, mime: file.type, size: file.size });

  return NextResponse.json({ url, name: file.name, mime: file.type, size: file.size });
}
