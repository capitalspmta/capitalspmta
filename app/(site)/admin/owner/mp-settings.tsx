"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Label } from "@/components/ui";

export default function MpSettings() {
  const [masked, setMasked] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/mercadopago")
      .then(r => r.json())
      .then(d => setMasked(d.masked ?? null))
      .catch(() => setMasked(null));
  }, []);

  async function save() {
    setMsg(null);
    if (!accessToken || accessToken.length < 20) {
      setMsg("Cole um token válido.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/settings/mercadopago", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d.message ?? "Falha ao salvar.");
      return;
    }
    setAccessToken("");
    const d = await fetch("/api/admin/settings/mercadopago").then(r => r.json());
    setMasked(d.masked ?? null);
    setMsg("Token atualizado.");
  }

  return (
    <Card className="p-5">
      <div className="font-semibold">Mercado Pago</div>
      <p className="text-sm text-white/55 mt-1">
        Defina o access token diretamente pelo site (somente OWNER). Em produção, recomenda-se criptografar esse valor no banco.
      </p>

      <div className="mt-4 text-sm text-white/70">
        Token atual: <span className="font-mono">{masked ?? "não definido"}</span>
      </div>

      <div className="mt-4 grid gap-2 max-w-xl">
        <Label>Novo MP_ACCESS_TOKEN</Label>
        <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-..." />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          {msg && <span className="text-sm text-white/70">{msg}</span>}
        </div>
      </div>
    </Card>
  );
}
