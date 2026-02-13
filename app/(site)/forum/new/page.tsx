"use client";

import { useEffect, useState } from "react";
import { Card, Button, Input, Label, Textarea } from "@/components/ui";

type Board = { id: string; name: string };

export default function NewTopic() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/forum/boards").then(r => r.json()).then(setBoards).catch(() => setBoards([]));
  }, []);

  async function upload(file: File) {
  setUploading(true);
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads/image", { method: "POST", body: form });
  setUploading(false);
  if (!res.ok) throw new Error("Falha ao enviar imagem.");
  return await res.json();
}

async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/forum/topics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId, title, content, imageUrls }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Falha ao criar tópico.");
      return;
    }
    const data = await res.json();
    window.location.href = `/forum/topic/${data.topicId}`;
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Criar tópico</h1>
      <p className="text-sm text-white/55 mt-1">Selecione a board e publique.</p>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label>Board</Label>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/15"
          >
            <option value="">Selecione…</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Atualização v1.2" />
        </div>

        <div className="space-y-2">
          <Label>Conteúdo</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva o post inicial..." />
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Publicando..." : "Publicar"}
        </Button>
      </form>
    </Card>
  );
}
