"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input } from "@/components/ui";

type Row = { id: string; label: string; pixKey?: string | null; holderName?: string | null; bankName?: string | null; agency?: string | null; accountNumber?: string | null; notes?: string | null };

export default function OwnerBank() {
  const [rows, setRows] = useState<Row[]>([]);
  const [label, setLabel] = useState("");
  const [pixKey, setPixKey] = useState("");

  async function load() {
    const res = await fetch("/api/admin/bankinfo");
    if (!res.ok) { alert("Sem permissão"); return; }
    setRows(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function add() {
    const res = await fetch("/api/admin/bankinfo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, pixKey }),
    });
    if (!res.ok) { alert("Falha"); return; }
    setLabel(""); setPixKey("");
    await load();
  }

  async function del(id: string) {
    if (!confirm("Deletar?")) return;
    const res = await fetch("/api/admin/bankinfo", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dados bancários</h1>
        <p className="mt-1 text-sm text-white/55">Somente OWNER.</p>
      </div>

      <Card className="p-5 space-y-3">
        <div className="font-semibold">Adicionar</div>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (ex: PIX Principal)" />
        <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Chave PIX" />
        <Button onClick={add}>Salvar</Button>
      </Card>

      <Card className="p-5 space-y-2">
        <div className="font-semibold">Registros</div>
        <div className="divide-y divide-white/10">
          {rows.map((r) => (
            <div key={r.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white/85">{r.label}</div>
                <div className="text-xs text-white/50">{r.pixKey ?? "—"}</div>
              </div>
              <Button variant="ghost" onClick={() => del(r.id)}>Deletar</Button>
            </div>
          ))}
          {rows.length === 0 && <div className="py-6 text-sm text-white/55">Sem dados.</div>}
        </div>
      </Card>
    </div>
  );
}
