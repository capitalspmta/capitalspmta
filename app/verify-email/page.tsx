"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState("");

  async function submit() {
    setStatus("loading");
    setMsg("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("ok");
      setMsg("E-mail verificado com sucesso. Você já pode entrar.");
      setTimeout(() => router.push("/login"), 800);
    } else {
      setStatus("err");
      setMsg(data?.message ?? "Falha ao verificar.");
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Verificação de e-mail</h1>
          <p className="mt-1 text-sm text-white/60">
            Digite o código de 6 dígitos que enviamos para o seu e-mail.
          </p>
        </div>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Código (6 dígitos)"
        />

        {msg && <div className={status === "err" ? "text-sm text-red-200" : "text-sm text-emerald-200"}>{msg}</div>}

        <Button onClick={submit} disabled={status === "loading" || code.length !== 6}>
          {status === "loading" ? "Verificando..." : "Confirmar"}
        </Button>

        <div className="text-xs text-white/45">
          Dica (local): ao registrar, o site mostra o código na tela para teste.
        </div>
      </Card>
    </div>
  );
}
