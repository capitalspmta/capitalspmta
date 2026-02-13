"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Label, Badge } from "@/components/ui";

type Category = { id: string; name: string; order: number; lockedAdminOnly?: boolean };
type Board = { id: string; name: string; categoryId: string; order: number; requireWhitelist: boolean; allowReplies: boolean; pointsOnTopic: number; pointsOnReply: number };

export default function AdminForum() {
  const [cats, setCats] = useState<Category[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [hiddenBoards, setHiddenBoards] = useState<string[]>([]);
  const [hiddenTopics, setHiddenTopics] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicResults, setTopicResults] = useState<any[]>([]);
  const [catName, setCatName] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardCat, setBoardCat] = useState("");

  async function load() {
    const res = await fetch("/api/admin/forum");
    if (!res.ok) return;
    const data = await res.json();
    setCats(data.categories);
    setBoards(data.boards);
    setHiddenBoards(data.hiddenBoards ?? []);
    setHiddenTopics(data.hiddenTopics ?? []);
    setBoardCat(data.categories?.[0]?.id ?? "");
  }

  async function toggleCatLock(id: string, lockedAdminOnly: boolean) {
    const res = await fetch("/api/admin/forum/category-lock", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, lockedAdminOnly }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  useEffect(() => { load(); }, []);

  async function createCat() {
    const res = await fetch("/api/admin/forum/category", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: catName }),
    });
    if (!res.ok) { alert("Falha"); return; }
    setCatName("");
    await load();
  }

async function deleteCat(id: string) {
  if (!confirm("Apagar esta categoria? Isso remove boards e conteúdos dentro dela.")) return;
  const res = await fetch("/api/admin/forum/category", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) { alert("Falha"); return; }
  await load();
}

async function createBoard() {

    const res = await fetch("/api/admin/forum/board", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: boardName, categoryId: boardCat }),
    });
    if (!res.ok) { alert("Falha"); return; }
    setBoardName("");
    await load();
  }

  async function updateBoard(id: string, patch: Partial<Board>) {
    const res = await fetch("/api/admin/forum/board", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }


  async function rename(kind: "category" | "board" | "topic", id: string, current: string) {
    const name = prompt("Novo nome:", current);
    if (!name || name.trim().length < 2) return;
    const res = await fetch("/api/admin/forum/rename", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id, name: name.trim() }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  async function toggleVisibility(kind: "board" | "topic", id: string, hidden: boolean) {
    const res = await fetch("/api/admin/forum/visibility", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, id, hidden }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  async function searchTopics(q: string) {
    setTopicQuery(q);
    if (q.trim().length < 2) { setTopicResults([]); return; }
    const res = await fetch(`/api/admin/forum/topic-search?q=${encodeURIComponent(q.trim())}`);
    if (!res.ok) { setTopicResults([]); return; }
    const data = await res.json();
    setTopicResults(data.topics ?? []);
  }

  function catNameById(id: string) {
    return cats.find((c) => c.id === id)?.name ?? "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Config do Fórum</h1>
        <p className="mt-1 text-sm text-white/55">Categorias, boards e opções de moderação (ADMIN+).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Categorias</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>Nova categoria</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex.: Roleplay" />
            </div>
            <Button className="w-full" onClick={createCat}>Criar</Button>
          </div>
          <div className="mt-6 space-y-2 text-sm text-white/70">
            {cats.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>• {c.name}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${c.lockedAdminOnly ? "bg-amber-500/15 text-amber-200" : "bg-white/5 text-white/50"}`}>
                    {c.lockedAdminOnly ? "Somente ADMIN posta" : "Aberta"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => rename("category", c.id, c.name)}
                    className="text-xs underline text-white/60 hover:text-white/85"
                  >
                    Renomear
                  </button>
                  <button
                    onClick={() => toggleCatLock(c.id, !Boolean(c.lockedAdminOnly))}
                    className="text-xs underline text-white/60 hover:text-white/85"
                  >
                    {c.lockedAdminOnly ? "Destrancar" : "Trancar"}
                  </button>
                  <button onClick={() => deleteCat(c.id)} className="text-xs underline text-red-200 hover:text-red-100">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Boards</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label>Novo board</Label>
              <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} placeholder="Ex.: Denúncias" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select value={boardCat} onChange={(e) => setBoardCat(e.target.value)} className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white">
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={createBoard}>Criar</Button>
          </div>
        </Card>
      </div>

      <Card className="p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold">Opções de moderação por board</h2>
        <div className="mt-4">
          <table className="w-full text-sm">
            <thead className="text-left text-white/55">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-3">Board</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3">Whitelist</th>
                <th className="py-2 pr-3">Postagens</th>
                <th className="py-2 pr-3">Pts tópico</th>
                <th className="py-2 pr-3">Pts reply</th>
                <th className="py-2 pr-3">Visibilidade</th>
                <th className="py-2 pr-3">Nome</th>
              </tr>
            </thead>
            <tbody className="text-white/75">
              {boards.map((b) => (
                <tr key={b.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 whitespace-nowrap">{b.name}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{catNameById(b.categoryId)}</td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => updateBoard(b.id, { requireWhitelist: !b.requireWhitelist })}>
                      {b.requireWhitelist ? "ON" : "OFF"}
                    </Button>
                  </td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => updateBoard(b.id, { allowReplies: !b.allowReplies })}>
                      {b.allowReplies ? "Aberto" : "Somente ADMIN"}
                    </Button>
                  </td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => {
                      const v = prompt("Pontos por criar tópico (0-100):", String(b.pointsOnTopic));
                      if (v === null) return;
                      const n = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
                      updateBoard(b.id, { pointsOnTopic: n });
                    }}>
                      <Badge>{b.pointsOnTopic}</Badge>
                    </Button>
                  </td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => {
                      const v = prompt("Pontos por reply (0-50):", String(b.pointsOnReply));
                      if (v === null) return;
                      const n = Math.max(0, Math.min(50, parseInt(v, 10) || 0));
                      updateBoard(b.id, { pointsOnReply: n });
                    }}>
                      <Badge>{b.pointsOnReply}</Badge>
                    </Button>
                  </td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => toggleVisibility("board", b.id, !hiddenBoards.includes(b.id))}>
                      {hiddenBoards.includes(b.id) ? "Invisível p/ users" : "Visível"}
                    </Button>
                  </td>
                  <td className="py-2 pr-3">
                    <Button variant="ghost" onClick={() => rename("board", b.id, b.name)}>Renomear</Button>
                  </td>
                </tr>
              ))}
              {boards.length === 0 && <tr><td colSpan={8} className="py-6 text-sm text-white/55">Sem boards.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Gerenciar tópicos</h2>
        <p className="mt-1 text-sm text-white/55">Buscar por título/ID e controlar visibilidade/renomear (ADMIN+).</p>

        <div className="mt-4 flex items-center gap-3">
          <Input value={topicQuery} onChange={(e) => searchTopics(e.target.value)} placeholder="Pesquisar tópico por título ou ID..." />
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {topicResults.map((t) => (
            <div key={t.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-white/80">
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-white/45">ID: {t.id} • Board: {t.board?.name ?? "—"} • Autor: {t.author?.username ?? "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => toggleVisibility("topic", t.id, !hiddenTopics.includes(t.id))}>
                  {hiddenTopics.includes(t.id) ? "Invisível p/ users" : "Visível"}
                </Button>
                <Button variant="ghost" onClick={() => rename("topic", t.id, t.title)}>Renomear</Button>
              </div>
            </div>
          ))}
          {topicQuery.trim().length >= 2 && topicResults.length === 0 && (
            <div className="text-white/55">Nenhum tópico encontrado.</div>
          )}
        </div>
      </Card>

</div>
  );
}
