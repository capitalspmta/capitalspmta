
"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string|null>(null);

  async function submit() {
    setMsg(null);
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ email, code, password, confirm }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.message || "Falha."); return; }
    setMsg("Senha atualizada. Você já pode entrar.");
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Redefinir senha</h1>
      <div className="mt-4 space-y-3">
        <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Seu email" />
        <Input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Código (6 dígitos)" />
        <Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Nova senha" />
        <Input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirmar nova senha" />
        <Button onClick={submit}>Trocar senha</Button>
        {msg && <div className="text-sm text-white/70">{msg}</div>}
        <div className="text-sm text-white/55"><Link className="underline" href="/auth/login">Voltar para login</Link></div>
      </div>
    </Card>
  );
}
