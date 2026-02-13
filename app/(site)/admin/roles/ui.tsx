"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";

type Role = { id: string; name: string; rank: number; description?: string | null; colorHex?: string | null };

const SYSTEM_ROLES = [
  { name: "USER", label: "USER (usuário)", hint: "Cargo padrão" },
  { name: "SUPPORT", label: "SUPPORT (staff)", hint: "Pode acessar ferramentas de suporte" },
  { name: "MODERATOR", label: "MODERATOR", hint: "Pode moderar" },
  { name: "ADMIN", label: "ADMIN", hint: "Administração" },
  { name: "OWNER", label: "OWNER", hint: "Dono" },
] as const;

export default function RolesClient() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [customName, setCustomName] = useState("");
  const [customRank, setCustomRank] = useState("1");

  async function load() {
    const r = await fetch("/api/admin/roles", { cache: "no-store" }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setRoles(Array.isArray(j?.roles) ? j.roles : []);
  }

  useEffect(() => { load(); }, []);

  const existing = useMemo(() => new Set(roles.map((r) => r.name)), [roles]);

  async function create(systemRole: string) {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemRole }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j?.message ?? "Falha ao criar."); return; }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createCustom() {
    const name = customName.trim();
    if (name.length < 2) { setMsg("Nome do cargo muito curto."); return; }
    const rankNum = Number(customRank);
    if (!Number.isFinite(rankNum) || rankNum < 1) { setMsg("Rank inválido."); return; }
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, rank: rankNum }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j?.message ?? "Falha ao criar."); return; }
      setCustomName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Apagar este cargo?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j?.message ?? "Falha ao apagar."); return; }
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white/90">Criar cargos do sistema</div>
            <div className="text-sm text-white/55 mt-1">
              Aqui você cria os cargos base do sistema (USER/SUPPORT/MODERATOR/ADMIN/OWNER).
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {SYSTEM_ROLES.map((r) => (
            <div key={r.name} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-white/90 font-medium">{r.label}</div>
                <div className="text-xs text-white/45 mt-1">{r.hint}</div>
              </div>
              <Button
                disabled={busy || existing.has(r.name)}
                onClick={() => create(r.name)}
                variant={existing.has(r.name) ? "ghost" : "primary"}
              >
                {existing.has(r.name) ? "Já existe" : "Criar"}
              </Button>
            </div>
          ))}
        </div>

        {msg ? <div className="mt-4 text-sm text-red-300">{msg}</div> : null}
      </Card>

      <Card className="p-5">
        <div className="text-lg font-semibold text-white/90">Criar cargo (customizado)</div>
        <div className="text-sm text-white/55 mt-1">
          Crie cargos para Loja/VIP/Fórum/etc. Você escolhe a categoria e o nome.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Nome do cargo</div>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: APOIADOR, VIP_BRONZE, FORUM_HELPER"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Rank</div>
            <input
              value={customRank}
              onChange={(e) => setCustomRank(e.target.value)}
              placeholder="1"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <Button disabled={busy} onClick={createCustom} variant="primary">Criar cargo</Button>
        </div>
        {msg ? <div className="mt-2 text-sm text-red-300">{msg}</div> : null}
      </Card>

      <Card className="p-5">
        <div className="text-lg font-semibold text-white/90">Cargos cadastrados</div>
        <div className="text-sm text-white/55 mt-1">Lista de cargos na tabela Role.</div>

        <div className="mt-4 space-y-2">
          {roles.length ? (
            roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div>
                  <div className="text-white/90 font-medium">{r.name}</div>
                  <div className="text-xs text-white/45">rank: {r.rank}{r.description ? ` • ${r.description}` : ""}</div>
                </div>
                <Button variant="danger" disabled={busy} onClick={() => del(r.id)}>Apagar</Button>
              </div>
            ))
          ) : (
            <div className="text-white/55">Nenhum cargo encontrado.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
