/** @type {import('next').NextConfig} */

/**
 * Permite Server Actions tanto no ambiente local quanto em produção.
 *
 * Em deploy (Vercel/Render/etc.), se `allowedOrigins` não incluir o domínio
 * real, o Next pode bloquear chamadas com erro de "origin not allowed".
 *
 * Configure `NEXT_PUBLIC_BASE_URL` (ex.: https://seu-dominio.com) e o domínio
 * será automaticamente incluído aqui.
 */
function buildAllowedOrigins() {
  const origins = new Set(["localhost:3000", "127.0.0.1:3000"]);

  // Suporta múltiplas URLs separadas por vírgula (útil para staging/prod).
  const raw = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "";
  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    try {
      const u = part.includes("://") ? new URL(part) : new URL(`https://${part}`);
      // allowedOrigins espera "host[:port]" (sem protocolo)
      origins.add(u.host);
    } catch {
      // Se não for URL válida, ignora silenciosamente.
    }
  }

  return Array.from(origins);
}

const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: buildAllowedOrigins() },
  },
};

export default nextConfig;
