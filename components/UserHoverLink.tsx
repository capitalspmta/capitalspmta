"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, cn } from "@/components/ui";
import { roleLabel } from "@/lib/role-label";

type CardUser = {
  id: string;
  username: string;
  role: string;
  points: number;
  online: boolean;
  lastSeenAt: string;
  vip: { name: string; expiresAt: string } | null;
  badges: Array<{ id: string; name: string; icon: string | null }>;
};

export default function UserHoverLink({
  userId,
  username,
  className,
  showMessageButton = true,
}: {
  userId: string;
  username: string;
  className?: string;
  showMessageButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CardUser | null>(null);
  const [loading, setLoading] = useState(false);
  const closeT = useRef<any>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  async function load() {
    if (data || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/users/${userId}/card`, { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (r.ok) setData(j?.user ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeT.current) clearTimeout(closeT.current);
    };
  }, []);

  function onEnter() {
    if (closeT.current) clearTimeout(closeT.current);
    setOpen(true);
    // Calcula posição em viewport (fixo), pra não ficar preso em painéis com overflow.
    try {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) {
        const left = Math.min(Math.max(8, r.left), window.innerWidth - 336);
        const top = Math.min(r.bottom + 8, window.innerHeight - 16);
        setPos({ left, top });
      }
    } catch {}
    load();
  }

  function onLeave() {
    if (closeT.current) clearTimeout(closeT.current);
    closeT.current = setTimeout(() => setOpen(false), 120);
  }

  async function startDm() {
    const r = await fetch("/api/dm/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.id) window.location.href = `/messages/${j.id}`;
  }

  const u = data;

  const tooltip = open ? (
    <div
      className="fixed z-[100000] w-[320px] rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur"
      style={pos ? { left: pos.left, top: pos.top } : undefined}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {u ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white/90 font-semibold leading-tight">{u.username}</div>
              <div className="text-xs text-white/45 mt-1">ID: {u.id}</div>
            </div>
            <div
              className={cn(
                "text-xs rounded-full px-2 py-1 border",
                u.online ? "border-emerald-400/30 text-emerald-200 bg-emerald-400/10" : "border-white/10 text-white/60 bg-white/5"
              )}
            >
              {u.online ? "Online" : "Offline"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/75">{roleLabel(u.role)}</span>
            <span className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/75">Pontos: {u.points}</span>
            {u.vip ? (
              <span
                className="text-xs rounded-full border border-yellow-300/30 bg-yellow-400/10 px-2 py-1 text-yellow-100"
                title={`VIP até ${new Date(u.vip.expiresAt).toLocaleString("pt-BR")}`}
              >
                VIP: {u.vip.name}
              </span>
            ) : null}
          </div>

          {u.badges?.length ? (
            <div className="flex flex-wrap gap-2">
              {u.badges.slice(0, 8).map((b) => (
                <span key={b.id} className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/75" title={b.name}>
                  {b.icon ? b.icon + " " : ""}{b.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/40">Sem emblemas.</div>
          )}

          {showMessageButton ? (
            <div className="flex items-center gap-2 pt-1">
              <Button className="w-full" onClick={startDm}>Mensagem</Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-white/60">{loading ? "Carregando..." : ""}</div>
      )}
    </div>
  ) : null;

  return (
    <span ref={anchorRef} className="inline-block" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link href={`/profile/${userId}`} className={cn("hover:underline", className)}>
        {username}
      </Link>
      {mounted ? (tooltip ? createPortal(tooltip, document.body) : null) : null}
    </span>
  );
}
