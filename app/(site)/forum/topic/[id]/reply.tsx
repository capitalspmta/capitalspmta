"use client";

import { useState } from "react";
import { Card, Button, Textarea } from "@/components/ui";

export default function ReplyBox({ topicId, canReply, authed, lockedMessage }: { topicId: string; canReply: boolean; authed: boolean; lockedMessage?: string | null }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
    const res = await fetch(`/api/forum/topics/${topicId}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content, imageUrls }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Falha ao responder.");
      return;
    }
    setContent("");
    window.location.reload();
  }

  if (!authed) {
    return (
      <Card className="p-5">
        <div className="text-sm text-white/55">Entre para responder neste tópico.</div>
        <a className="text-sm text-white underline" href="/auth/login">Ir para login</a>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Responder</h2>
      {!canReply ? (
        <p className="mt-2 text-sm text-white/55">{lockedMessage ?? "Este tópico está trancado."}</p>
      ) : (
        <form className="mt-4 space-y-3" onSubmit={submit}>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva sua resposta..." />
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Enviando..." : "Enviar resposta"}
          </Button>
        </form>
      )}
    </Card>
  );
}
