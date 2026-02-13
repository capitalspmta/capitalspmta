"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Label } from "@/components/ui";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);

  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        phone: phone || undefined,
        recoveryEmail: recoveryEmail || undefined,
        password,
        confirm,
        accepted,
      }),
    });

    setLoading(false);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data?.message ?? "Falha ao criar conta.");
      return;
    }

    if (data?.verifyUrl) {
      setVerifyUrl(String(data.verifyUrl));
      if (data?.verifyCode) setVerifyCode(String(data.verifyCode));
      return;
    }

    window.location.href = "/login";
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
      <p className="mt-1 text-sm text-white/55">
        Você precisa verificar o e-mail para ativar a conta.
      </p>

      {verifyUrl && (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="font-semibold">Quase lá!</div>
          <div className="mt-1 text-sm text-white/70">
            Enviamos um código de verificação para o seu e-mail. Em ambiente local, o código aparece aqui para teste:
          </div>
          {verifyCode && (
            <div className="mt-3 rounded-xl bg-black/30 border border-white/10 p-3 text-center text-2xl tracking-[0.35em]">
              {verifyCode}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => (window.location.href = "/verify-email")}>
              Inserir código
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigator.clipboard.writeText(verifyCode ?? "")} disabled={!verifyCode}>
              Copiar código
            </Button>
          </div>
        </div>

      )}
      {!verifyUrl && (
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seu_usuario" />
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </div>

          <div className="space-y-2">
            <Label>Telefone (opcional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>

          <div className="space-y-2">
            <Label>E-mail reserva (opcional)</Label>
            <Input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="reserva@exemplo.com" />
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 8 caracteres" />
          </div>

          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="repita" />
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-black/30"
            />
            <span className="text-sm text-white/70">
              Aceito os <span className="text-white">Termos</span> e a <span className="text-white">Privacidade</span>.
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <Button className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>

          <div className="text-sm text-white/60">
            Já tem conta?{" "}
            <Link className="text-white underline" href="/login">
              Entrar
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}