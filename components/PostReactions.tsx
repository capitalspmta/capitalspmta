"use client";

import { useState } from "react";

export default function PostReactions({ postId, initialCount, initialMine }: { postId: string; initialCount: number; initialMine: boolean }) {
  const [count, setCount] = useState(initialCount);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/forum/posts/${postId}/react`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emoji: "👍" }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setCount(Number(j.count || 0));
        setMine(Boolean(j.mine));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      className={
        "inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs " +
        (mine ? "border-white/30 bg-white/15 text-white" : "border-white/10 bg-black/20 text-white/80 hover:bg-white/10")
      }
      title="Reagir"
    >
      <span>👍</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
