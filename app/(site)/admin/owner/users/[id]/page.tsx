"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function OwnerUserEditPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [email, setEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // tenta puxar email atual
    fetch(`/api/admin/owner/users/${id}/info`).then(r => r.json()).then(j => setEmail(j?.user?.email || "")).catch(() => {});
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/owner/users/${id}/credentials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: newPass }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Falha ao salvar");
      alert("Atualizado.");
      setNewPass("");
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Editar usuário</h1>
          <div className="text-xs text-white/50 font-mono">{id}</div>
        </div>
        <Link href="/admin/owner/users" className="underline text-white/70 hover:text-white">Voltar</Link>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-sm text-white/70 mb-1">Email</div>
          <input className="input w-full" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
        </div>

        <div>
          <div className="text-sm text-white/70 mb-1">Nova senha (opcional)</div>
          <input className="input w-full" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Digite uma nova senha" />
          <div className="text-xs text-white/45 mt-1">Se deixar vazio, não muda a senha.</div>
        </div>

        <button disabled={saving} onClick={save} className="btn w-full">{saving ? "Salvando..." : "Salvar alterações"}</button>
      </div>
    </div>
  );
}
