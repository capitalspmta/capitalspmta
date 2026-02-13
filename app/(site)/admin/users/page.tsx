"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Input } from "@/components/ui";

type RoleRow = { id: string; name: string; rank: number };

type ProductRow = { id: string; sku: string; name: string; priceCents: number; isActive: boolean };
type PurchaseRow = { id: string; provider: string; status: string; createdAt: string; items: { sku: string; name: string }[] };

type UserRow = { id: string; email: string; username: string; role: string; createdAt: string; points?: number; bannedUntil?: string | null; whitelistStatus?: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [purchaseModalUser, setPurchaseModalUser] = useState<UserRow | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [userPurchases, setUserPurchases] = useState<PurchaseRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [manageUser, setManageUser] = useState<UserRow | null>(null);

  async function load() {
    const [uRes, rRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/roles"),
    ]);
    if (!uRes.ok) { setError("Sem permissão ou falha."); return; }
    const data = await uRes.json();
    setRows(data);

    if (rRes.ok) {
      const rs = await rRes.json();
      const list = Array.isArray(rs) ? rs : (rs?.roles ?? []);
      setRoles(Array.isArray(list) ? list : []);
    }

  }

  async function openPurchaseModal(u: UserRow) {
    setPurchaseModalUser(u);
    setSelectedProductId("");
    setSelectedQty(1);
    // Produtos (para atribuição)
    const pRes = await fetch("/api/admin/owner/products").catch(() => null as any);
    if (pRes?.ok) {
      const ps = await pRes.json().catch(() => []);
      const list = Array.isArray(ps) ? ps : (ps?.products ?? ps);
      setProducts(Array.isArray(list) ? list : []);
    } else {
      setProducts([]);
    }
    // Compras do usuário
    const r = await fetch(`/api/admin/users/manual-purchases?userId=${encodeURIComponent(u.id)}`).catch(() => null as any);
    if (r?.ok) {
      const data = await r.json().catch(() => ({}));
      setUserPurchases(Array.isArray(data?.purchases) ? data.purchases : []);
    } else {
      setUserPurchases([]);
    }
  }

  function groupItems(items: { sku: string; name: string }[]) {
    const map = new Map<string, { name: string; qty: number }>();
    for (const it of items) {
      const key = it.sku || it.name;
      const prev = map.get(key);
      if (prev) prev.qty += 1;
      else map.set(key, { name: it.name, qty: 1 });
    }
    return Array.from(map.values());
  }

  async function grantPurchase() {
    if (!purchaseModalUser) return;
    if (!selectedProductId) { alert("Selecione um produto."); return; }
    const res = await fetch("/api/admin/users/manual-purchases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "grant", userId: purchaseModalUser.id, productId: selectedProductId, quantity: selectedQty }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data?.message ?? "Falha"); return; }
    await openPurchaseModal(purchaseModalUser);
  }

  async function revokePurchase(purchaseId: string) {
    if (!confirm("Revogar esta compra?")) return;
    const res = await fetch("/api/admin/users/manual-purchases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "revoke", purchaseId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data?.message ?? "Falha"); return; }
    if (purchaseModalUser) await openPurchaseModal(purchaseModalUser);
  }
  useEffect(() => { load(); }, []);

  // Abre config pelo perfil: /admin/users?manage=<id>
  useEffect(() => {
    if (!rows.length) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get("manage");
      if (!id) return;
      const u = rows.find(r => r.id === id);
      if (u) setManageUser(u);
    } catch {}
  }, [rows]);


  async function openRoleModal(u: UserRow) {
    setRoleModalUser(u);
    const res = await fetch(`/api/admin/users/custom-roles?id=${encodeURIComponent(u.id)}`);
    const data = await res.json().catch(() => []);
    if (res.ok) setSelectedRoleIds((data || []).map((x: any) => x.id));
    else setSelectedRoleIds([]);
  }

  async function saveCustomRoles() {
    if (!roleModalUser) return;
    const res = await fetch("/api/admin/users/custom-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: roleModalUser.id, roleIds: selectedRoleIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data?.message ?? "Falha"); return; }
    setRoleModalUser(null);
  }

  async function setRole(id: string, role: string) {
    const res = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d?.message ?? "Falha");
      return;
    }
    await load();
  }
  async function unlockMta(userId: string) {
    const res = await fetch("/api/admin/users/mta-unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data?.message ?? "Falha ao liberar serial."); return; }
    alert("Serial liberado para alteração.");
  }



  async function ban(id: string, days: number) {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch("/api/admin/users/ban", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, until }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  async function unban(id: string) {
    const res = await fetch("/api/admin/users/ban", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, until: null }),
    });
    if (!res.ok) { alert("Falha"); return; }
    await load();
  }

  async function delUser(id: string) {
    if (!confirm("Apagar usuário? (soft delete)")) return;
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d?.message ?? "Falha"); return; }
    await load();
  }

  async function points(id: string, delta: number) {
    const reason = prompt("Motivo (opcional):", "") || undefined;
    const res = await fetch("/api/admin/users/points", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, delta, reason }),
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); alert(d?.message ?? "Falha"); return; }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-white/55">Cargos, ban temporário, pontos e remoção. (Algumas ações exigem OWNER.)</p>
      </div>

      {error && <div className="text-sm text-red-200">{error}</div>}

      <Card className="p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-white/55">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-3">Usuário</th>
              <th className="py-2 pr-3">E-mail</th>
              <th className="py-2 pr-3">Cargo</th>
              <th className="py-2 pr-3">Whitelist</th>
              <th className="py-2 pr-3">Pontos</th>
              <th className="py-2 pr-3">Bloqueio</th>
              <th className="py-2 pr-3">Ações</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-white/5 align-top">
                <td className="py-2 pr-3">{u.username}</td>
                <td className="py-2 pr-3">{u.email}</td>
                <td className="py-2 pr-3"><Badge>{u.role}</Badge></td>
                <td className="py-2 pr-3"><Badge>{u.whitelistStatus ?? "—"}</Badge></td>
                <td className="py-2 pr-3"><Badge>{u.points ?? 0}</Badge></td>
                <td className="py-2 pr-3 text-xs text-white/55 whitespace-nowrap">
                  {u.bannedUntil ? new Date(u.bannedUntil).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-2">
                    {["USER","SUPPORT","MODERATOR","ADMIN","OWNER"].map((r) => (
                      <Button key={r} variant="ghost" onClick={() => setRole(u.id, r)}>{r}</Button>
                    ))}
                    <Button variant="ghost" onClick={() => openRoleModal(u)}>Cargos personalizados</Button>
                    <Button variant="ghost" onClick={() => openPurchaseModal(u)}>Compras manuais</Button>
                    <Button variant="ghost" onClick={() => unlockMta(u.id)}>Liberar serial MTA</Button>
                    <Button variant="ghost" onClick={() => { const d = prompt("Banir por quantos dias? (0 para desbanir)","1"); if (d===null) return; const n = Number(d); if (Number.isNaN(n) || n<0) return; ban(u.id, n); }}>Ban (dias)</Button>
                    <Button variant="ghost" onClick={() => unban(u.id)}>Unban</Button>
                    <Button variant="ghost" onClick={() => { const v = prompt("Ajuste de pontos (ex: 10 ou -15):","10"); if (v===null) return; const n = Number(v); if (Number.isNaN(n) || !Number.isFinite(n) || n===0) return; points(u.id, n); }}>Ajustar pontos</Button>
                    <Button variant="ghost" onClick={() => delUser(u.id)}>Apagar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>


      {manageUser && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Configurar usuário</div>
              <div className="text-sm text-white/55">@{manageUser.username} • {manageUser.email}</div>
            </div>
            <Button variant="ghost" onClick={() => setManageUser(null)}>Fechar</Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["USER","SUPPORT","MODERATOR","ADMIN","OWNER"].map((r) => (
              <Button key={r} variant="ghost" onClick={() => setRole(manageUser.id, r)}>{r}</Button>
            ))}
            <Button variant="ghost" onClick={() => openRoleModal(manageUser)}>Cargos personalizados</Button>
            <Button variant="ghost" onClick={() => openPurchaseModal(manageUser)}>Compras manuais</Button>
            <Button variant="ghost" onClick={() => unlockMta(manageUser.id)}>Liberar serial MTA</Button>
            <Button variant="ghost" onClick={() => { const d = prompt("Banir por quantos dias? (0 para desbanir)","1"); if (d===null) return; const n = Number(d); if (Number.isNaN(n) || n<0) return; ban(manageUser.id, n); }}>Ban (dias)</Button>
            <Button variant="ghost" onClick={() => unban(manageUser.id)}>Unban</Button>
            <Button variant="ghost" onClick={() => { const v = prompt("Ajuste de pontos (ex: 10 ou -15):","10"); if (v===null) return; const n = Number(v); if (Number.isNaN(n) || !Number.isFinite(n) || n===0) return; points(manageUser.id, n); }}>Ajustar pontos</Button>
            <Button variant="ghost" onClick={() => delUser(manageUser.id)}>Apagar</Button>
          </div>
        </Card>
      )}

      {roleModalUser && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Cargos personalizados</div>
              <div className="text-sm text-white/55">{roleModalUser.username} • {roleModalUser.email}</div>
            </div>
            <Button variant="ghost" onClick={() => setRoleModalUser(null)}>Fechar</Button>
          </div>

          <div className="mt-4 grid gap-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(r.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedRoleIds((s) => [...s, r.id]);
                    else setSelectedRoleIds((s) => s.filter((x) => x !== r.id));
                  }}
                />
                <div className="flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-white/50">Prioridade: {r.rank}</div>
                </div>
              </label>
            ))}
            {roles.length === 0 && <div className="text-sm text-white/60">Nenhum cargo criado.</div>}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={saveCustomRoles}>Salvar</Button>
            <Button variant="ghost" onClick={() => setRoleModalUser(null)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {purchaseModalUser && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Compras manuais</div>
              <div className="text-sm text-white/55">{purchaseModalUser.username} • {purchaseModalUser.email}</div>
            </div>
            <Button variant="ghost" onClick={() => setPurchaseModalUser(null)}>Fechar</Button>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="text-sm text-white/70">Atribuir uma compra manualmente (entrega igual à loja):</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[260px]">
                <div className="text-xs text-white/55 mb-1">Produto</div>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {products.filter(p => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} • {p.sku} • R$ {(p.priceCents/100).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="w-[140px]">
                <div className="text-xs text-white/55 mb-1">Quantidade</div>
                <Input value={String(selectedQty)} onChange={(e) => setSelectedQty(Math.max(1, Math.min(100, Number(e.target.value||"1"))))} />
              </div>
              <Button onClick={grantPurchase}>Atribuir compra</Button>
            </div>

            <div className="mt-3 text-sm text-white/70">Compras do usuário:</div>
            <div className="space-y-2">
              {userPurchases.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-white/55">
                      {new Date(p.createdAt).toLocaleString("pt-BR")} • {p.provider} • <span className="text-white/80">{p.status}</span>
                    </div>
                    {p.status === "PAID" && (
                      <Button variant="ghost" onClick={() => revokePurchase(p.id)}>Revogar</Button>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-white/80">
                    {groupItems(p.items || []).map((g, idx) => (
                      <div key={idx}>• {g.name} x{g.qty}</div>
                    ))}
                    {(p.items?.length ?? 0) === 0 && <div className="text-white/55">Sem itens.</div>}
                  </div>
                </div>
              ))}
              {userPurchases.length === 0 && <div className="text-sm text-white/55">Nenhuma compra encontrada.</div>}
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}