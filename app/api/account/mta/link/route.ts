import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({
  // MTA serial is a 32-char hex string.
  serial: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-F]{32}$/, "Serial inválido (precisa ter 32 caracteres hex)."),
  // Nome de login da conta do MTA (ex.: cronos)
  login: z.string().trim().min(2).max(32).optional(),
  // ID numérico da conta (se o seu servidor usa ID separado)
  accountId: z.string().trim().min(1).max(32).optional(),
  // compatibilidade antiga
  account: z.string().trim().min(2).max(128).optional(),
});

function normalizeAccount(login?: string, accountId?: string, legacy?: string | null) {
  const l = (login || "").trim();
  const id = (accountId || "").trim();
  const legacyTrim = (legacy || "").trim();

  // Se veio um legacy simples (antigo) e não veio os novos, mantém.
  if (!l && !id && legacyTrim) return legacyTrim;

  // Armazena como JSON string no campo mtaAccount (pois schema SQLite não tem Json).
  const payload: any = {};
  if (l) payload.login = l;
  if (id) payload.id = id;
  if (!payload.login && legacyTrim) payload.login = legacyTrim;
  return JSON.stringify(payload);
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return req.json().catch(() => null);
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return null;
    return {
      serial: String(fd.get("mtaSerial") ?? fd.get("serial") ?? "").trim(),
      login: String(fd.get("mtaLogin") ?? fd.get("login") ?? "").trim() || undefined,
      accountId: String(fd.get("mtaId") ?? fd.get("accountId") ?? fd.get("id") ?? "").trim() || undefined,
      account: String(fd.get("mtaAccount") ?? fd.get("account") ?? "").trim() || undefined,
    };
  }
  return null;
}

export async function POST(req: Request) {
  const user = await requireUserApi();
  const body = await readBody(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });

  const serial = parsed.data.serial; // already normalized by zod
  const account = normalizeAccount(parsed.data.login, parsed.data.accountId, parsed.data.account || null);

  const serialOwner = await prisma.gameAccount.findUnique({ where: { mtaSerial: serial }, select: { userId: true } });
  if (serialOwner && serialOwner.userId !== user.id) {
    return NextResponse.json({ message: "Este serial já está vinculado a outro usuário." }, { status: 409 });
  }

  const current = await prisma.gameAccount.findUnique({ where: { userId: user.id } });

  // Regra: o jogador só pode definir o serial UMA vez por conta.
  // Depois disso, apenas um admin pode liberar para alteração (GameAccount.locked = false via /admin/users).
  // A conta MTA (nickname) ainda pode ser ajustada, mas o serial fica travado.

  // Se já existe vínculo, respeita lock (para qualquer fase)
  if (current) {
    // permite atualizar apenas o nickname/conta
    if (serial === current.mtaSerial) {
      await prisma.gameAccount.update({ where: { userId: user.id }, data: { mtaAccount: account } });
      return NextResponse.json({ ok: true });
    }

    if (current.locked) {
      return NextResponse.json(
        { message: "Você já vinculou um serial. Para trocar, peça liberação de um administrador." },
        { status: 403 }
      );
    }

    // serial foi liberado por admin
    await prisma.gameAccount.update({
      where: { userId: user.id },
      data: {
        mtaSerial: serial,
        mtaAccount: account,
        // após trocar, trava de novo
        locked: true,
        changedAfterApproved: user.whitelistStatus === "APPROVED" ? true : current.changedAfterApproved,
      },
    });

    await audit("mta.serial_change", "User", user.id, { serial, account, phase: user.whitelistStatus });
    return NextResponse.json({ ok: true });
  }

  // Primeira vez: cria e já trava.
  if (user.whitelistStatus !== "APPROVED") {
    await prisma.gameAccount.create({
      data: { userId: user.id, mtaSerial: serial, mtaAccount: account, locked: true, changedAfterApproved: false },
    });

    await audit("mta.link", "User", user.id, { serial, account, phase: "pre_wl" });

    // se veio de form, redireciona de volta pra whitelist
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return NextResponse.redirect(new URL("/whitelist", req.url));
    return NextResponse.json({ ok: true });
  }

  // Primeira vez pós-WL (caso raro): cria e já trava
  await prisma.gameAccount.create({
    data: { userId: user.id, mtaSerial: serial, mtaAccount: account, locked: true, changedAfterApproved: true },
  });
  await audit("mta.link_after_wl", "User", user.id, { serial, account });
  return NextResponse.json({ ok: true });
}
