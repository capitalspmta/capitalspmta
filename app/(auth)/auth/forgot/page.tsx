
"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string|null>(null);
  const [devCode, setDevCode] = useState<string|null>(null);

  async function submit() {
    setMsg(null); setDevCode(null);
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json();
    setMsg("Se esse email existir, enviamos um código de recuperação.");
    if (j.devCode) setDevCode(j.devCode);
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Recuperar conta</h1>
      <p className="mt-2 text-white/55 text-sm">Você receberá um código de 6 dígitos para redefinir sua senha.</p>
      <div className="mt-4 space-y-3">
        <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Seu email" />
        <Button onClick={submit}>Enviar código</Button>
        {msg && <div className="text-sm text-white/70">{msg}</div>}
        {devCode && <div className="text-sm text-yellow-200">DEV (localhost): código = <b>{devCode}</b></div>}
        <div className="text-sm text-white/55">Já tem o código? <Link className="underline" href="/auth/reset">Redefinir senha</Link></div>
      </div>
    </Card>
  );
}
