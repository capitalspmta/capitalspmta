"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";

type Row = {
  id: string;
  createdAt: string;
  status: string;
  amountCents: number;
  externalId: string | null;
  meta: string | null;
  items: { sku: string; name: string }[];
  user: { username: string; email: string };
};

const statuses = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

function safeParseMeta(meta: string | null): any {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function summarizeItems(p: Row) {
  const meta = safeParseMeta(p.meta);
  const map = new Map<string, { name: string; qty: number }>();

  for (const it of p.items || []) {
    const key = it.sku || it.name;
    const prev = map.get(key);
    if (prev) prev.qty += 1;
    else map.set(key, { name: it.name || it.sku, qty: 1 });
  }

  if (meta?.type === "COINS" && Number.isFinite(meta?.coins)) {
    map.set("CAPITAL_COINS", { name: "Capital Coins", qty: Number(meta.coins) });
  }

  return Array.from(map.values());
}

export default function AdminPurchases() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/purchases");
    if (!res.ok) { setError("Sem permissão ou falha."); return; }
    const data = await res.json();
    setRows(data);
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/admin/purchases/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compras (Staff)</h1>
        <p className="mt-1 text-sm text-white/55">Lista completa com itens e quantidade por compra.</p>
      </div>

      {error && <div className="text-sm text-red-200">{error}</div>}

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/55">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-3">Quando</th>
              <th className="py-2 pr-3">Usuário</th>
              <th className="py-2 pr-3">Itens</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Valor</th>
              <th className="py-2 pr-3">External</th>
              <th className="py-2 pr-3">Ações</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {rows.map((p) => {
              const items = summarizeItems(p);
              const itemsLabel = items.length ? items.map((x) => `${x.name} x${x.qty}`).join(" • ") : "—";

              return (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(p.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{p.user.username}</td>
                  <td className="py-2 pr-3 min-w-[260px]">
                    <div className="text-white/85">{itemsLabel}</div>
                    <div className="text-xs text-white/40 truncate">{p.user.email}</div>
                  </td>
                  <td className="py-2 pr-3"><Badge>{p.status}</Badge></td>
                  <td className="py-2 pr-3 whitespace-nowrap">R$ {(p.amountCents / 100).toFixed(2)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{p.externalId ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-2">
                      {statuses.map((s) => (
                        <Button key={s} variant="ghost" onClick={() => setStatus(p.id, s)}>{s}</Button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-sm text-white/55">Sem compras.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
