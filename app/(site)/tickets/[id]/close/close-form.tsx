"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";

type Target = { id: string; username: string; role: string };

export default function CloseTicketForm(props: { ticketId: string; pendingTargets: Target[] }) {
  const { ticketId, pendingTargets } = props;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { stars: number; feedback: string }>>({});

  function setStars(targetId: string, stars: number) {
    setRatings((prev) => ({ ...prev, [targetId]: { stars, feedback: prev[targetId]?.feedback ?? "" } }));
  }
  function setFeedback(targetId: string, feedback: string) {
    setRatings((prev) => ({ ...prev, [targetId]: { stars: prev[targetId]?.stars ?? 5, feedback } }));
  }

  async function submit() {
    setError(null);

    if (pendingTargets.length === 0) {
      setError("Você não tem avaliações pendentes neste ticket.");
      return;
    }

    for (const u of pendingTargets) {
      const r = ratings[u.id];
      if (!r || !r.stars || r.stars < 1 || r.stars > 5 || !r.feedback || r.feedback.trim().length < 3) {
        setError("Avaliação obrigatória: dê estrelas (1–5) e escreva um feedback (mín. 3 caracteres) para todos os usuários listados.");
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        ratings: pendingTargets.map((t) => ({
          targetUserId: t.id,
          stars: ratings[t.id].stars,
          feedback: ratings[t.id].feedback,
        })),
      };

      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Falha ao enviar avaliações.");
        return;
      }

      // Volta para o ticket
      window.location.href = `/tickets/${ticketId}`;
    } catch (e) {
      setError("Erro ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {pendingTargets.length === 0 ? (
        <Card className="p-5">
          <div className="text-sm text-white/70">Sem avaliações pendentes para você neste ticket.</div>
          <div className="mt-2 text-xs text-white/40">Se o ticket ainda não foi encerrado, aguarde o outro lado enviar a avaliação.</div>
        </Card>
      ) : (
        <Card className="p-5 space-y-4">
          <div className="text-sm text-white/70">Avaliações pendentes (obrigatório)</div>
          {pendingTargets.map((u) => (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white/85">{u.username} <span className="text-white/45">({u.role})</span></div>
              <div className="mt-2 flex items-center gap-2">
                {[1,2,3,4,5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStars(u.id, s)}
                    className={`h-8 w-8 rounded-xl border border-white/10 ${ratings[u.id]?.stars === s ? "bg-white/15" : "bg-black/20"}`}
                    title={`${s} estrela${s>1?"s":""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <Input
                  value={ratings[u.id]?.feedback ?? ""}
                  onChange={(e) => setFeedback(u.id, e.target.value)}
                  placeholder="Escreva um feedback..." 
                />
              </div>
            </div>
          ))}
          {error && <div className="text-sm text-red-200">{error}</div>}
          <Button disabled={busy} onClick={submit} className="w-full">Enviar avaliações</Button>
        </Card>
      )}
    </div>
  );
}
