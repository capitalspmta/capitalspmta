"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Label, Divider } from "@/components/ui";

export default function LoginPage() {
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ emailOrUser, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Falha ao entrar.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    window.location.href = data?.redirect || "/forum";
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
      <p className="mt-1 text-sm text-white/55">Use seu usuário ou e-mail.</p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label>Usuário ou e-mail</Label>
          <Input value={emailOrUser} onChange={(e) => setEmailOrUser(e.target.value)} placeholder="Digite seu usuário ou e-mail" />
        </div>

        <div className="space-y-2">
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <Divider />

        <p className="text-center text-sm text-white/60">
          Não tem conta?{" "}
          <Link className="text-white hover:text-white/90" href="/auth/register">
            Criar conta
          </Link>
        </p>
        <p className="text-center text-xs text-white/35">
          Use seu usuário/e-mail e senha para entrar. Se ainda não tem conta, crie no registro.
        </p>
      </form>
    </Card>
  );
}
