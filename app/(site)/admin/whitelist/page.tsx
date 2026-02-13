"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Input } from "@/components/ui";

type Q = { id: string; prompt: string; required: boolean; order: number };
type Cfg = { enabled: boolean; pausedUntil: string | null; successTitle: string; successBody: string };
type AppRow = { id: string; createdAt: string; user: { id: string; username: string; email: string; role: string } };

export default function AdminWhitelist() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  async function loadAll() {
    setError(null);
    const qRes = await fetch("/api/admin/whitelist/questions");
    if (!qRes.ok) { setError("Sem permissão."); return; }
    const qData = await qRes.json();
    setQuestions(qData.questions);
    setCfg(qData.cfg);

    const aRes = await fetch("/api/admin/whitelist/applications?status=PENDING");
    if (aRes.ok) {
      const data = await aRes.json();
      setApps(data.apps || []);
    }

    const appr = await fetch("/api/admin/whitelist/applications?status=APPROVED_USERS");
    if (appr.ok) {
      const d = await appr.json();
      setApproved(d.users || []);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function addQuestion() {
    const res = await fetch("/api/admin/whitelist/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: newPrompt, required: true, order: questions.length + 1 }),
    });
    if (!res.ok) { alert("Falha"); return; }
    setNewPrompt("");
    await loadAll();
  }

  
  async function editQuestion(q: Q) {
    const next = window.prompt("Editar pergunta:", q.prompt);
    if (next == null) return;
    const res = await fetch(`/api/admin/whitelist/questions/${q.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: next }),
    });
    if (!res.ok) { alert("Falha ao editar"); return; }
    await loadAll();
  }


  async function delQuestion(id: string) {
    if (!confirm("Apagar pergunta?")) return;
    const res = await fetch("/api/admin/whitelist/questions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await loadAll();
  }

  async function saveCfg(next: Partial<Cfg>) {
    const res = await fetch("/api/admin/whitelist/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...cfg, ...next }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await loadAll();
  }

  async function openDetails(id: string) {
    setSelectedId(id);
    setSelected(null);
    const res = await fetch(`/api/admin/whitelist/applications/detail?id=${encodeURIComponent(id)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) { alert(data?.message ?? "Falha ao carregar respostas."); return; }
    setSelected(data);
  }


  async function revokeWL(userId: string) {
    const reason = window.prompt("Motivo da revogação (opcional):", "") || "";
    const res = await fetch("/api/admin/whitelist/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, reason }),
    });
    if (!res.ok) { alert("Falha ao revogar."); return; }
    await loadAll();
  }

  async function review(id: string, action: "APPROVE" | "REJECT") {
    let reason: string | undefined = undefined;
    if (action === "REJECT") {
      reason = window.prompt("Motivo da reprova?") || "";
      if (!reason.trim()) return;
    }
    const res = await fetch("/api/admin/whitelist/applications/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.message ?? "Falha"); return; }
    await loadAll();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Whitelist (Staff)</h1>
        <p className="mt-1 text-sm text-white/55">Perguntas, status e aprovações/reprovas.</p>
      </div>

      {error && <div className="text-sm text-red-200">{error}</div>}

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Ativa: {cfg?.enabled ? "SIM" : "NÃO"}</Badge>
          <Badge>Pausa: {cfg?.pausedUntil ? new Date(cfg.pausedUntil).toLocaleString("pt-BR") : "—"}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => saveCfg({ enabled: !(cfg?.enabled ?? true) })}>
            {cfg?.enabled ? "Desativar" : "Ativar"}
          </Button>
          <Button variant="ghost" onClick={() => {
            const v = prompt("Pausar até (YYYY-MM-DD HH:mm) ou vazio pra remover pausa:", "");
            if (v === null) return;
            const iso = v.trim() ? new Date(v).toISOString() : null;
            saveCfg({ pausedUntil: iso });
          }}>
            Definir pausa
          </Button>
        </div>

        <div className="grid gap-2">
          <div className="text-sm text-white/70">Mensagem de aprovação (usuário)</div>
          <Input value={cfg?.successTitle ?? ""} onChange={(e) => setCfg((c) => c ? ({...c, successTitle: e.target.value}) : c)} placeholder="Título" />
          <Input value={cfg?.successBody ?? ""} onChange={(e) => setCfg((c) => c ? ({...c, successBody: e.target.value}) : c)} placeholder="Texto" />
          <Button onClick={() => saveCfg({ successTitle: cfg?.successTitle ?? "", successBody: cfg?.successBody ?? "" })}>Salvar mensagem</Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="font-semibold">Perguntas</div>
          <div className="flex gap-2">
            <Input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="Nova pergunta..." />
            <Button onClick={addQuestion}>Adicionar</Button>
          </div>
          <div className="divide-y divide-white/10">
            {questions.map((q) => (
              <div key={q.id} className="py-3 flex items-start justify-between gap-3">
                <div className="text-sm text-white/80">
                  <div className="font-medium">{q.order}. {q.prompt}</div>
                  <div className="text-xs text-white/45">{q.required ? "Obrigatória" : "Opcional"}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => editQuestion(q)}>Editar</Button>
                  <Button variant="ghost" onClick={() => delQuestion(q.id)}>Apagar</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="font-semibold">Whitelist pendentes</div>
          <div className="divide-y divide-white/10">
            {apps.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/85">{a.user.username}</div>
                  <div className="text-xs text-white/45">{new Date(a.createdAt).toLocaleString("pt-BR")} • {a.user.email}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => openDetails(a.id)}>Ver respostas</Button>
                  <Button onClick={() => review(a.id, "APPROVE")}>Aprovar</Button>
                  <Button variant="ghost" onClick={() => review(a.id, "REJECT")}>Reprovar</Button>
                </div>
              </div>
            ))}
            {apps.length === 0 && <div className="py-6 text-sm text-white/55">Nenhuma whitelist pendente.</div>}
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="font-semibold">Whitelist aprovadas</div>
          <div className="divide-y divide-white/10">
            {approved.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white/85">{u.username}</div>
                  <div className="text-xs text-white/45">{u.email} • Último online: {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString("pt-BR") : "—"}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => revokeWL(u.id)}>Revogar WL</Button>
                </div>
              </div>
            ))}
            {approved.length === 0 && <div className="py-6 text-sm text-white/55">Nenhum usuário aprovado.</div>}
          </div>
        </Card>
      </div>

      {selectedId && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Respostas da Whitelist</div>
              <div className="text-sm text-white/55">
                {selected?.user?.username ? `${selected.user.username} • ${selected.user.email}` : "Carregando..."}
              </div>
            </div>
            <Button variant="ghost" onClick={() => { setSelectedId(null); setSelected(null); }}>Fechar</Button>
          </div>

          {!selected && <div className="mt-4 text-sm text-white/60">Carregando...</div>}

          {selected && (
            <div className="mt-4 space-y-3">
              {(selected.answers || [])
                .slice()
                .sort((x: any, y: any) => (x.question?.order ?? 0) - (y.question?.order ?? 0))
                .map((ans: any) => (
                  <div key={ans.id} className="rounded-xl bg-white/5 p-4">
                    <div className="text-sm font-medium">{ans.question?.prompt ?? "Pergunta"}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-white/75">{ans.value}</div>
                  </div>
                ))}
              {(selected.answers || []).length === 0 && (
                <div className="text-sm text-white/60">Sem respostas registradas.</div>
              )}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
