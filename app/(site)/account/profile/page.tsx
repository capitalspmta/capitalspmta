"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, Button, Input, Badge } from "@/components/ui";

type Me = { id: string; email: string; username: string; role: string; avatarKey?: string; avatarUrl?: string | null; phone?: string | null; recoveryEmail?: string | null; points: number; whitelistStatus: string; discordId?: string | null; discordUsername?: string | null; gameAccounts?: { mtaSerial: string; mtaAccount?: string | null; locked?: boolean; changedAfterApproved?: boolean }[] };

export default function AccountProfile() {
  const [me, setMe] = useState<Me | null>(null);
  const searchParams = useSearchParams();
  const tab = useMemo(() => (searchParams.get("tab") || "profile").toLowerCase(), [searchParams]);

  const [username, setUsername] = useState("");
  const [avatarKey, setAvatarKey] = useState("avatar1");
  const [phone, setPhone] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [mtaSerial, setMtaSerial] = useState("");
  const [mtaLogin, setMtaLogin] = useState("");
  const [mtaId, setMtaId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  async function uploadAvatar() {
    setMsg(null); setError(null);
    if (!avatarFile) { setMsg("Selecione uma imagem."); return; }
    const fd = new FormData();
    fd.append("file", avatarFile);
    const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) { setError(j.message || "Falha ao enviar avatar."); return; }
    setMsg("Avatar atualizado.");
    await load();
  }

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newConf, setNewConf] = useState("");

  async function changePassword() {
    setMsg(null); setError(null);
    const res = await fetch("/api/account/password", { method: "POST", headers: { "content-type":"application/json" }, body: JSON.stringify({ current: curPass, next: newPass, confirm: newConf }) });
    const j = await res.json();
    if (!res.ok) { setError(j.message || "Falha ao alterar senha."); return; }
    setMsg("Senha alterada com sucesso.");
    setCurPass(""); setNewPass(""); setNewConf("");
  }


  async function load() {
    const res = await fetch("/api/account/me");
    if (!res.ok) { setError("Faça login."); return; }
    const data = await res.json();
    setMe(data);
    setUsername(data.username);
    setAvatarKey(data.avatarKey || "avatar1");
    setPhone(data.phone || "");
    setRecoveryEmail(data.recoveryEmail || "");

    const ga = (data.gameAccounts && data.gameAccounts[0]) ? data.gameAccounts[0] : null;
    setMtaSerial(ga?.mtaSerial || "");
    // mtaAccount pode ser legado (string) ou JSON string { login, id }
    const raw = (ga?.mtaAccount || "") as string;
    let login = "", id = "";
    const t = raw.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      try {
        const obj = JSON.parse(t);
        login = String(obj?.login || "");
        id = String(obj?.id || "");
      } catch {}
    } else {
      login = t;
    }
    setMtaLogin(login);
    setMtaId(id);
  }

  useEffect(() => { load(); }, []);

  async function linkMta() {
  setMsg(null);
  if (!mtaSerial || mtaSerial.length < 6) { setMsg("Informe seu serial do MTA."); return; }
  const res = await fetch("/api/account/mta/link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ serial: mtaSerial, login: mtaLogin || undefined, accountId: mtaId || undefined }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) { setMsg(d.message ?? "Falha ao vincular."); return; }
  setMsg("Vinculado com sucesso.");
  await load();
}

async function save() {
    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, avatarKey, phone, recoveryEmail }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d?.message ?? "Falha");
      return;
    }
    await load();
  }

  async function linkDiscord() {
    window.location.href = "/api/discord/connect";
  }

  if (error) return <div className="text-sm text-red-200">{error}</div>;
  if (!me) return <div className="text-white/60">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
        <p className="mt-1 text-sm text-white/55">Perfil, vínculo de Discord e informações.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/account/profile?tab=profile" className={`rounded-2xl border border-white/10 px-4 py-2 text-sm ${tab==="profile"?"bg-white/15":"bg-white/5 hover:bg-white/10 text-white/80"}`}>Meu perfil</Link>
          <Link href="/account/profile?tab=mta" className={`rounded-2xl border border-white/10 px-4 py-2 text-sm ${tab==="mta"?"bg-white/15":"bg-white/5 hover:bg-white/10 text-white/80"}`}>Vincular MTA</Link>
          <Link href="/account/messages" className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 text-sm">Meus bate-papos</Link>
          <Link href="/account/purchases" className="rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/80">Minhas compras</Link>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{me.role}</Badge>
          <Badge>Whitelist: {me.whitelistStatus}</Badge>
          <Badge>Pontos: {me.points}</Badge>
        </div>

        <div className="grid gap-3">
          <div className="text-sm text-white/70">E-mail</div>
          <div className="text-sm text-white/85">{me.email}</div>

          {tab === "profile" && (
            <>
          <div className="text-sm text-white/70 mt-4">Avatar</div>
          <div className="grid grid-cols-6 gap-2">
            {["avatar1","avatar2","avatar3","avatar4","avatar5","avatar6"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAvatarKey(k)}
                className={`h-12 w-12 rounded-xl border ${avatarKey === k ? "border-emerald-400" : "border-white/10"} bg-white/5 overflow-hidden`}
                title={k}
              >
                <img src={`/avatars/${k}.svg`} alt={k} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="text-sm text-white/70 mt-4">Telefone</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          <div className="text-sm text-white/70 mt-2">E-mail reserva</div>
          <Input value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="reserva@exemplo.com" />
          <div className="text-sm text-white/70 mt-2">Username</div>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button onClick={save}>Salvar</Button>

          <div className="text-sm text-white/70 mt-2">Discord</div>
          <div className="text-sm text-white/85">{me.discordId ?? "Não vinculado"}</div>
          <Button variant="ghost" onClick={linkDiscord}>Vincular Discord</Button>
            </>
          )}

          {tab === "mta" && (
            <>
              <div className="text-sm text-white/70 mt-2">Vincular conta do MTA</div>
              <div className="text-xs text-white/55">Isso é usado para entregar automaticamente VIPs e cash da loja quando você entrar no servidor.</div>

              <div className="mt-2">
                <div className="text-xs text-white/60">Serial (obrigatório)</div>
                <Input
                  value={mtaSerial}
                  onChange={(e) => setMtaSerial(e.target.value)}
                  placeholder="Ex.: ABCDEF123456..."
                  disabled={Boolean(me.gameAccounts?.[0]?.mtaSerial) && Boolean(me.gameAccounts?.[0]?.locked)}
                />
                {me.gameAccounts?.[0]?.mtaSerial && me.gameAccounts?.[0]?.locked && (
                  <div className="mt-2 text-xs text-white/55">
                    Seu serial já foi vinculado e está bloqueado. Para trocar, peça para um administrador liberar em <b>Admin → Usuários</b>.
                  </div>
                )}
              </div>

              <div className="mt-2">
                <div className="text-xs text-white/60">Login da conta no MTA (recomendado)</div>
                <Input value={mtaLogin} onChange={(e) => setMtaLogin(e.target.value)} placeholder="Ex.: cronos" />
              </div>

              <div className="mt-2">
                <div className="text-xs text-white/60">ID da conta no MTA (se o seu servidor usa ID separado)</div>
                <Input value={mtaId} onChange={(e) => setMtaId(e.target.value)} placeholder="Ex.: 123" />
              </div>

              <Button onClick={linkMta}>Salvar vínculo MTA</Button>
              {msg && <div className="text-sm text-white/70">{msg}</div>}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}