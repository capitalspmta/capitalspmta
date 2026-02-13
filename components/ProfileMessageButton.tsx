"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

export default function ProfileMessageButton({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const r = await fetch("/api/dm/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.id) {
        window.location.href = `/messages/${j.id}`;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button disabled={busy} onClick={start}>
      {busy ? "Abrindo..." : "Enviar mensagem"}
    </Button>
  );
}
