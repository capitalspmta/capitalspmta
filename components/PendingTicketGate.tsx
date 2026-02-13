"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Payload = { count: number; nextTicketId: string | null; href: string | null };

const ALLOWLIST_PREFIXES = [
  "/tickets/", // allow ticket close page, but we'll special-case below
  "/auth/",
  "/api/",
];

export default function PendingTicketGate() {
  const pathname = usePathname();
  const [pending, setPending] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const isClosePage = useMemo(() => pathname?.includes("/tickets/") && pathname?.endsWith("/close"), [pathname]);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/me/pending-ticket-ratings", { cache: "no-store" });
        const data = (await res.json()) as Payload;
        if (!active) return;
        setPending(data);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    const t = setInterval(poll, 15000);
    return () => { active = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!pending || loading) return;
    if (pending.count <= 0) return;

    // Se já está na página correta, não faz nada.
    if (isClosePage) return;

    // Redireciona para o primeiro ticket pendente.
    if (pending.href) window.location.href = pending.href;
  }, [pending, loading, isClosePage]);

  if (loading) return null;
  if (!pending || pending.count <= 0) return null;
  if (isClosePage) return null;

  // Overlay bloqueando o site enquanto houver pendências
  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-black/60 p-6">
        <div className="text-lg font-semibold text-white/90">Avaliação obrigatória pendente</div>
        <div className="mt-2 text-sm text-white/65">
          Você precisa avaliar o atendimento antes de continuar usando o site.
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
            onClick={() => pending.href && (window.location.href = pending.href)}
          >
            Avaliar agora ({pending.count})
          </button>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}
