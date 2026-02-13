import { Card, Button, Badge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StorePage() {
  await requireUser();


  const coinPriceCents = Number(process.env.STORE_COIN_PRICE_CENTS || "100"); // preço por 1 coin (centavos)
  const minTotalCents = Number(process.env.STORE_COIN_MIN_TOTAL_CENTS || "1000"); // mínimo em centavos (R$10)
  const computedMinCoins = Math.max(1, Math.ceil(minTotalCents / Math.max(1, coinPriceCents)));
  const coinMin = Number(process.env.STORE_COIN_MIN || String(computedMinCoins));
  const coinMax = Number(process.env.STORE_COIN_MAX || "100000");


  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
    select: { sku: true, name: true, description: true, priceCents: true, durationDays: true, grantVipRole: true, grantPoints: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Loja</h1>
        <p className="mt-1 text-sm text-white/55">
          Compras em produção via Mercado Pago. Recompensas e expiração automáticas.
        </p>
      </div>

      
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Comprar Coins</div>
            <div className="mt-1 text-sm text-white/55">
              Escolha a quantidade e pague via Mercado Pago. (Preço: R$ {(coinPriceCents / 100).toFixed(2)} por coin)
            </div>
          </div>
          <Badge>Coins</Badge>
        </div>

        <form className="mt-4 flex flex-col gap-3 md:flex-row md:items-end" action="/api/payments/mercadopago/create-preference" method="post">
          <div className="flex-1">
            <div className="text-xs text-white/60 mb-1">Quantidade</div>
            <input
              name="coins"
              type="number"
              min={coinMin}
              max={coinMax}
              step={1}
              defaultValue={coinMin}
              className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90"
            />
            <div className="mt-1 text-xs text-white/45">Mín: {coinMin} • Máx: {coinMax}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-white/60 mb-1">Cupom (opcional)</div>
            <input name="coupon" type="text" placeholder="Ex: BLACKCARD10" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90" />
            <div className="mt-1 text-xs text-white/45">Se você tiver um cupom, aplique aqui antes de pagar.</div>
          </div>
          <Button className="md:w-[260px]" type="submit">Comprar Coins</Button>
        </form>
      </Card>


      <div className="grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <Card key={p.sku} className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{p.name}</div>
              <Badge>R$ {(p.priceCents / 100).toFixed(2)}</Badge>
            </div>

            <div className="mt-3 text-sm text-white/70 space-y-1">
              {p.grantVipRole ? <div>VIP: <span className="text-white">{p.grantVipRole}</span></div> : null}
              {p.durationDays ? <div>Duração: <span className="text-white">{p.durationDays} dias</span></div> : null}
              {p.grantPoints ? <div>Pontos: <span className="text-white">+{p.grantPoints}</span></div> : null}
              {p.description ? <div className="text-white/55">{p.description}</div> : null}
            </div>

            <form className="mt-6 space-y-2" action="/api/payments/mercadopago/create-preference" method="post">
              <input type="hidden" name="sku" value={p.sku} />
              <input name="coupon" type="text" placeholder="Cupom (opcional)" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-white/90" />
              <Button className="w-full" type="submit">Comprar com Mercado Pago</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
