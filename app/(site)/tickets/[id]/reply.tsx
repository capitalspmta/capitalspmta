"use client";

import { useState } from "react";
import { Card, Button, Textarea } from "@/components/ui";

export default function TicketReply({ ticketId }: { ticketId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "Falha ao enviar mensagem.");
      return;
    }
    setContent("");
    window.location.reload();
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Responder</h2>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Digite sua mensagem..." />
        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Enviando..." : "Enviar"}</Button>
      </form>
    </Card>
  );
}
