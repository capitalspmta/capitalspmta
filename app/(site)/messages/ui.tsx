
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Conv = any;

export default function MessagesClient() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const r = await fetch("/api/dm/conversations");
    const j = await r.json();
    setConvs(j.conversations || []);
  }

  useEffect(() => { load(); const t=setInterval(load, 5000); return ()=>clearInterval(t); }, []);

  const filtered = useMemo(() => {
    const s=q.trim().toLowerCase();
    if (!s) return convs;
    return convs.filter(c => c.participants?.some((p:any)=>p.user?.username?.toLowerCase().includes(s)));
  }, [convs,q]);

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mensagens (DM)</h1>
          <p className="text-sm text-white/55 mt-1">Converse em privado com outros jogadores.</p>
        </div>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar conversa..." className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none" />
      </div>

      <div className="card">
        <div className="space-y-2">
          {filtered.length ? filtered.map((c:any) => {
            const other = c.participants?.map((p:any)=>p.user).find((u:any)=>u);
            const last = c.messages?.[0];
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="block rounded-2xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-white/90 font-medium">{other?.username || "Conversa"}</div>
                  <div className="text-xs text-white/45">{last ? new Date(last.createdAt).toLocaleString("pt-BR") : ""}</div>
                </div>
                <div className="text-sm text-white/55 line-clamp-1 mt-1">{last?.content || "Sem mensagens ainda."}</div>
              </Link>
            );
          }) : <div className="text-sm text-white/55">Nenhuma conversa.</div>}
        </div>
      </div>
    </div>
  );
}
