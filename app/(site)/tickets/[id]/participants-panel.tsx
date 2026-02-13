"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui";

type U = { id: string; username: string; role: string; email?: string };

export default function ParticipantsPanel(props: {
  ticketId: string;
  participants: U[];
  canManage: boolean;
}) {
  const { ticketId, participants, canManage } = props;
  const [q, setQ] = useState("");
  const [results, setResults] = useState<U[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const participantIds = useMemo(() => new Set(participants.map(p => p.id)), [participants]);

  useEffect(() => {
    let alive = true;
    async function run() {
      setMsg(null);
      const qq = q.trim();
      if (!canManage || qq.length < 2) { setResults([]); return; }
      setBusy(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(qq)}`);
        const data = await res.json().catch(() => ({ users: [] }));
        if (!alive) return;
        setResults(data.users || []);
      } catch {
        if (!alive) return;
        setResults([]);
      } finally {
        if (alive) setBusy(false);
      }
    }
    const t = setTimeout(run, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, canManage]);

  async function add(userId: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data?.message ?? "Falha ao adicionar."); return; }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/participants`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(data?.message ?? "Falha ao remover."); return; }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/85">Participantes</div>
          <div className="text-xs text-white/55">Quem pode ler e responder este ticket.</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {participants.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/80">
            <span className="font-semibold">{p.username}</span>
            <span className="text-white/45">({p.role})</span>
            {canManage && (
              <button
                disabled={busy}
                onClick={() => remove(p.id)}
                className="ml-2 text-xs underline text-white/50 hover:text-white/80 disabled:opacity-50"
                title="Remover participante"
              >
                remover
              </button>
            )}
          </span>
        ))}
      </div>

      {canManage && (
        <>
          <div className="mt-5">
            <div className="text-xs text-white/55">Adicionar usuário (busque por nome ou e-mail)</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Digite pelo menos 2 letras…"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80 outline-none"
            />
            <div className="mt-2 text-[11px] text-white/40">
              {busy ? "Buscando…" : "Dica: digite 2+ caracteres para aparecer a lista com o botão Adicionar."}
            </div>
          </div>

          {(q.trim().length >= 2) && (
            <div className="mt-3 space-y-2">
              {results.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                  Nenhum usuário encontrado.
                </div>
              ) : results.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-sm text-white/80">
                    <span className="font-semibold">{u.username}</span> <span className="text-white/45">({u.role})</span>
                    {u.email ? <div className="text-xs text-white/45">{u.email}</div> : null}
                  </div>
                  <button
                    disabled={busy || participantIds.has(u.id)}
                    onClick={() => add(u.id)}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/80 hover:bg-white/15 disabled:opacity-50"
                  >
                    {participantIds.has(u.id) ? "Já está" : "Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {msg && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{msg}</div>}
        </>
      )}
    </Card>
  );
}
