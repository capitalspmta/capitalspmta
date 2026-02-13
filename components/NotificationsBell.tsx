"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type N = { id: string; message: string; href?: string | null; read: boolean; createdAt: string };

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<number>(0);
  const [items, setItems] = useState<N[]>([]);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/notifications/recent", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    setUnread(Number(data?.unread ?? 0));
    setItems(Array.isArray(data?.items) ? data.items : []);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
    await load();
  }

  async function openNotification(n: N) {
    // Marca como lida e redireciona (se tiver destino)
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [n.id] }),
    }).catch(() => {});
    await load();
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80 hover:bg-white/10"
        aria-label="Notificações"
        type="button"
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[11px] leading-[18px] text-white text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-white/10 bg-black/90 backdrop-blur p-3 shadow-xl z-[100000]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white/85">Notificações</div>
            <div className="flex items-center gap-3">
              <button onClick={markAllRead} className="text-xs underline text-white/60 hover:text-white">Marcar tudo como lido</button>
              <button onClick={() => setOpen(false)} className="text-xs text-white/60 hover:text-white">✕</button>
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-[340px] overflow-auto pr-1">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={`w-full text-left rounded-xl border border-white/10 px-3 py-2 hover:bg-white/10 ${n.read ? "bg-black/30" : "bg-white/10"}`}
                title={n.href ? "Abrir" : "Marcar como lido"}
              >
                <div className="text-xs text-white/45">{new Date(n.createdAt).toLocaleString("pt-BR")}</div>
                <div className="text-sm text-white/80 mt-1 whitespace-pre-wrap">{n.message}</div>
                {n.href ? <div className="mt-1 text-[11px] text-white/40">Clique para abrir</div> : null}
              </button>
            ))}
            {items.length === 0 && <div className="text-sm text-white/55 py-4">Sem notificações.</div>}
          </div>

          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/account/messages" className="text-xs underline text-white/60 hover:text-white" onClick={() => setOpen(false)}>
                Meus bate-papos
              </Link>
            </div>
            <span className="text-[11px] text-white/40">Atualiza automaticamente</span>
          </div>
        </div>
      )}
    </div>
  );
}
