import { prisma } from "@/lib/prisma";

/**
 * Config dinâmico (armazenado no DB) para evitar depender apenas de .env
 * - Use para tokens sensíveis (ex.: Mercado Pago) com acesso restrito a OWNER.
 *
 * Observação: Em produção, considere criptografar valores sensíveis no banco.
 */

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getMpAccessToken(): Promise<string | null> {
  return (await getSetting("mp_access_token")) ?? (process.env.MP_ACCESS_TOKEN ?? null);
}


export async function getJsonArray(key: string): Promise<string[]> {
  const raw = await getSetting(key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export async function setJsonArray(key: string, value: string[]): Promise<void> {
  await setSetting(key, JSON.stringify(Array.from(new Set(value))));
}

export async function toggleJsonArrayItem(key: string, item: string, enabled: boolean): Promise<void> {
  const arr = await getJsonArray(key);
  const next = enabled ? Array.from(new Set([...arr, item])) : arr.filter((x) => x !== item);
  await setJsonArray(key, next);
}
