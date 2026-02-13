"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "@/components/ui";

type Role = { id: string; name: string };
type Product = { id: string; sku: string; name: string; priceCents: number; grantVipRole?: string | null; durationDays?: number | null; isActive: boolean; mtaActions?: any };
type Coupon = { id: string; code: string; percentOff?: number | null; uses: number; maxUses?: number | null; expiresAt?: string | null; isActive: boolean; createdAt: string };

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OwnerProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [roleName, setRoleName] = useState<string>("");
  const [durationDays, setDurationDays] = useState<string>("30");
  const [description, setDescription] = useState<string>("");
  const [mtaAcl, setMtaAcl] = useState<string>("");
  const [mtaMoney, setMtaMoney] = useState<string>("");

  const [couponCode, setCouponCode] = useState<string>("");
  const [couponPercent, setCouponPercent] = useState<string>("10");

  async function load() {
    const r = await fetch("/api/admin/owner/products", { cache: "no-store" }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setProducts(Array.isArray(j?.products) ? j.products : []);
    setRoles(Array.isArray(j?.roles) ? j.roles : []);
    // não força cargo por padrão

    const cr = await fetch("/api/admin/owner/coupons", { cache: "no-store" }).catch(() => null);
    const cj = await cr?.json().catch(() => null);
    setCoupons(Array.isArray(cj?.coupons) ? cj.coupons : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectableRoles = useMemo(() => {
    // exclui cargos do sistema (USER/SUPPORT/MODERATOR/ADMIN/OWNER) da lista de produtos por padrão
    const block = new Set(["USER", "SUPPORT", "MODERATOR", "ADMIN", "OWNER"]);
    return roles.filter((r) => !block.has(r.name));
  }, [roles]);

  async function create() {
    setMsg(null);
    const n = name.trim();
    if (n.length < 2) return setMsg("Nome do produto muito curto.");
    const priceNum = Number(String(price).replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setMsg("Valor inválido.");
    // cargo é opcional (pode vender apenas o produto/benefício sem conceder cargo)
    const dur = durationDays.trim() === "" ? null : Number(durationDays);
    if (dur !== null && (!Number.isFinite(dur) || dur <= 0)) return setMsg("Duração inválida.");

    setBusy(true);
    try {
      const r = await fetch("/api/admin/owner/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n, priceReais: priceNum, grantRoleName: roleName || null, durationDays: dur, description: description.trim() || null, mtaAcl: mtaAcl.trim() || null, mtaMoney: mtaMoney.trim() ? Number(mtaMoney) : null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j?.message ?? "Falha ao criar produto.");
      setName("");
      setPrice("0");
      setDurationDays("30");
      setDescription("");
      setMtaAcl("");
      setMtaMoney("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Product) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/owner/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg(j?.message ?? "Falha ao atualizar.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createCoupon() {
    setCouponMsg(null);
    const code = couponCode.trim();
    if (code.length < 2) return setCouponMsg("Nome do cupom muito curto.");
    const pct = Number(String(couponPercent).replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return setCouponMsg("Percentual inválido (1 a 100).");

    setBusy(true);
    try {
      const r = await fetch("/api/admin/owner/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, percentOff: Math.round(pct) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setCouponMsg(j?.message ?? "Falha ao criar cupom.");
      setCouponCode("");
      setCouponPercent("10");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleCoupon(c: Coupon) {
    setBusy(true);
    setCouponMsg(null);
    try {
      const r = await fetch("/api/admin/owner/coupons", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setCouponMsg(j?.message ?? "Falha ao atualizar cupom.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="text-lg font-semibold text-white/90">Produtos (Loja)</div>
        <div className="text-sm text-white/55 mt-1">
          Crie produtos informando valor, nome, duração (opcional) e (se quiser) o cargo que o usuário ganha ao comprar.
        </div>

        <div className="mt-3">
          <div className="text-xs text-white/60 mb-1">Descrição (opcional)</div>
          <textarea
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90 min-h-[90px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do produto"
          />
        </div>


        <div className="mt-3">
          <div className="text-xs text-white/60 mb-1">ACL do MTA (opcional)</div>
          <input
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            value={mtaAcl}
            onChange={(e) => setMtaAcl(e.target.value)}
            placeholder="Ex: grupo blackcard (nome exato da ACL no MTA)"
          />
          <div className="text-[11px] text-white/45 mt-1">
            Se preenchido, o endpoint do MTA vai retornar essa ACL para o jogador vinculado (aplicação no jogo é feita pelo script do MTA).
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-white/60 mb-1">Cash no jogo (MTA) (opcional)</div>
          <input
            className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            value={mtaMoney}
            onChange={(e) => setMtaMoney(e.target.value)}
            placeholder="Ex: 500000"
          />
          <div className="text-[11px] text-white/45 mt-1">
            Se preenchido, a entrega automática do MTA vai creditar esse valor para o jogador após o pagamento.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Nome do produto</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: VIP Apoiador"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Valor (R$)</div>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10.00"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Cargo concedido</div>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            >
              <option value="">Nenhum (não concede cargo)</option>
              {selectableRoles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-white/45 mt-1">Dica: crie o cargo primeiro em “Cargos & Permissões”.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Duração (dias)</div>
            <input
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="30"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
            <div className="text-xs text-white/45 mt-1">Deixe vazio para permanente.</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <Button disabled={busy} onClick={create} variant="primary">
            Criar produto
          </Button>
        </div>

        {msg ? <div className="mt-3 text-sm text-red-300">{msg}</div> : null}
      </Card>

      <Card className="p-5">
        <div className="text-lg font-semibold text-white/90">Cupons de desconto</div>
        <div className="text-sm text-white/55 mt-1">Crie cupons por porcentagem (ex.: 10% OFF) para usar nas compras da loja.</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Nome do cupom</div>
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Ex: BLACKCARD10"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
            <div className="text-[11px] text-white/45 mt-1">Apenas letras, números, _ ou -</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60 mb-1">Desconto (%)</div>
            <input
              value={couponPercent}
              onChange={(e) => setCouponPercent(e.target.value)}
              placeholder="10"
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
          </div>
          <div className="flex items-end justify-end">
            <Button disabled={busy} onClick={createCoupon} variant="primary" className="w-full md:w-[220px]">
              Criar cupom
            </Button>
          </div>
        </div>

        {couponMsg ? <div className="mt-3 text-sm text-red-300">{couponMsg}</div> : null}

        <div className="mt-4 space-y-2">
          {coupons.length ? (
            coupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div>
                  <div className="text-white/90 font-medium">{c.code}</div>
                  <div className="text-xs text-white/45">
                    {c.percentOff ? `${c.percentOff}% OFF` : "-"} • usos: {c.uses}{c.maxUses ? `/${c.maxUses}` : ""}
                  </div>
                </div>
                <Button disabled={busy} variant={c.isActive ? "ghost" : "primary"} onClick={() => toggleCoupon(c)}>
                  {c.isActive ? "Desativar" : "Ativar"}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-white/55">Nenhum cupom criado.</div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-lg font-semibold text-white/90">Lista de produtos</div>
        <div className="mt-4 space-y-2">
          {products.length ? (
            products.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <div>
                  <div className="text-white/90 font-medium">{p.name}</div>
                  <div className="text-xs text-white/45">
                    {brl(p.priceCents)} • sku: {p.sku} • cargo: {p.grantVipRole ?? "-"} • duração: {p.durationDays ? `${p.durationDays}d` : "permanente"}
                  </div>
                </div>
                <Button disabled={busy} variant={p.isActive ? "ghost" : "primary"} onClick={() => toggleActive(p)}>
                  {p.isActive ? "Desativar" : "Ativar"}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-white/55">Nenhum produto encontrado.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
