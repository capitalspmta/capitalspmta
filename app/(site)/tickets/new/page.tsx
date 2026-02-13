"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Label, Textarea } from "@/components/ui";

type Cat = { id: string; slug: string; name: string; description?: string };

export default function NewTicket() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tickets/categories").then(r => r.json()).then(setCats).catch(() => setCats([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categoryId, title, content, priority }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Falha ao abrir ticket.");
      return;
    }
    const data = await res.json();
    window.location.href = `/tickets/${data.ticketId}`;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Abrir ticket</h1>
      <p className="text-sm text-white/55 mt-1">Escolha uma categoria e descreva com detalhes.</p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/15"
          >
            <option value="">Selecione…</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-white/35">{cats.find(c => c.id === categoryId)?.description ?? ""}</p>
        </div>

        <div className="space-y-2">
          <Label>Prioridade</Label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/15"
          >
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Denúncia de abuso" />
        </div>

        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Explique o que aconteceu, inclua IDs, horários, prints, etc." />
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Abrindo..." : "Abrir ticket"}
        </Button>
      </form>
    </Card>
  );
}
