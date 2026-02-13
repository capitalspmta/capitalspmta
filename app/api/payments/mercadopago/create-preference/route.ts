import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";


async function loadCoupon(codeRaw: string | null | undefined) {
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) return null;
  const c = await prisma.coupon.findUnique({ where: { code }, select: { id: true, code: true, percentOff: true, amountOffCents: true, maxUses: true, uses: true, expiresAt: true, isActive: true } });
  if (!c || !c.isActive) return null;
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now()) return null;
  if (c.maxUses != null && c.uses >= c.maxUses) return null;
  return c;
}

function applyCouponToAmount(amountCents: number, coupon: any | null) {
  if (!coupon) return { finalCents: amountCents, discountCents: 0 };
  let discount = 0;
  if (coupon.amountOffCents != null && coupon.amountOffCents > 0) discount = coupon.amountOffCents;
  if (coupon.percentOff != null && coupon.percentOff > 0) {
    const d = Math.floor((amountCents * coupon.percentOff) / 100);
    discount = Math.max(discount, d);
  }
  discount = Math.max(0, Math.min(amountCents, discount));
  return { finalCents: amountCents - discount, discountCents: discount };
}


function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

/**
 * Cria preferência de pagamento no Mercado Pago.
 * - Cria um registro Purchase PENDING
 * - Retorna init_point para o usuário pagar
 *
 * Para produção:
 * - Ajuste back_urls e notification_url
 * - Valide itens / preço no servidor (NÃO confie no form do cliente)
 */
export async function POST(req: Request) {
  const user = await requireUserApi();
  const form = await req.formData();

  const couponRaw = form.get("coupon");
  const coupon = await loadCoupon(couponRaw ? String(couponRaw) : "");

  const coinsRaw = form.get("coins");
  const coins = coinsRaw != null && String(coinsRaw).trim() !== "" ? Number(coinsRaw) : 0;

  const isCoinsPurchase = Number.isFinite(coins) && coins > 0;

  // Compra de Capital Coins (valor dinâmico) - usa o MESMO fluxo/endpoint do Mercado Pago
  if (isCoinsPurchase) {
    const coinPriceCents = Number(process.env.STORE_COIN_PRICE_CENTS || "100");
    const minTotalCents = Number(process.env.STORE_COIN_MIN_TOTAL_CENTS || "1000"); // R$10
    const computedMinCoins = Math.max(1, Math.ceil(minTotalCents / Math.max(1, coinPriceCents)));
    const coinMin = Number(process.env.STORE_COIN_MIN || String(computedMinCoins));
    const coinMax = Number(process.env.STORE_COIN_MAX || "100000");

    if (!Number.isInteger(coins) || coins < coinMin || coins > coinMax) {
      return NextResponse.json({ message: `Quantidade de coins inválida. Mínimo equivalente a R$10 (>= ${coinMin}) e máximo ${coinMax}.` }, { status: 400 });
    }
    if (!Number.isFinite(coinPriceCents) || coinPriceCents <= 0) {
      return NextResponse.json({ message: "Configuração de preço de coin inválida (STORE_COIN_PRICE_CENTS)." }, { status: 500 });
    }

    const amountCentsBase = coins * coinPriceCents;
    const { finalCents: amountCents, discountCents } = applyCouponToAmount(amountCentsBase, coupon);

    // Produto base para referenciar PurchaseItem (schema exige productId)
    const coinProduct = await prisma.product.upsert({
      where: { sku: "CAPITAL_COINS" },
      create: {
        sku: "CAPITAL_COINS",
        name: "Capital Coins",
        description: "Moeda virtual Capital Coins",
        priceCents: 0,
        grantPoints: 0,
        isActive: false,
      },
      update: { isActive: false, name: "Capital Coins" },
      select: { id: true, sku: true, name: true },
    });

    // Cria Purchase + PurchaseItem
    const purchase = await prisma.purchase.create({
      data: {
        userId: user.id,
        status: "PENDING",
        provider: "MERCADOPAGO",
        amountCents,
        currency: "BRL",
        meta: JSON.stringify({ type: "COINS", coins, couponCode: coupon?.code || null, discountCents: discountCents || 0 }),
        items: {
          create: [{
            productId: coinProduct.id,
            sku: coinProduct.sku,
            name: "Capital Coins",
            priceCents: amountCents,
            grantPoints: coins,
          }],
        },
      },
      select: { id: true },
    });

    const accessToken = await (await import("@/lib/settings")).getMpAccessToken();
    if (!accessToken) {
      return NextResponse.json({ message: "Mercado Pago não configurado (MP_ACCESS_TOKEN vazio)." }, { status: 400 });
    }

    // Base URL / URLs de retorno
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    const origin = req.headers.get("origin") || "";
    const pick = (v: string) => {
      const s = (v || "").trim();
      if (!s) return "";
      if (s.startsWith("http://") || s.startsWith("https://")) return s;
      return "https://" + s.replace(/^\/+/, "");
    };
    baseUrl = (pick(baseUrl) || pick(origin) || "http://localhost:3000").replace(/\/+$/, "");

    // O Mercado Pago costuma REJEITAR notification_url que não seja HTTPS.
    // Para ambiente local, deixe MP_NOTIFICATION_URL apontando para um endpoint público (ngrok/Vercel),
    // ou então omitimos notification_url e o status será atualizado via retorno + polling no painel.
    const envNotif = (process.env.MP_NOTIFICATION_URL || "").trim();
    const fallbackNotif = `${baseUrl}/api/payments/mercadopago/webhook`;
    const candidateNotif = envNotif || fallbackNotif;
    const notificationUrl = candidateNotif.startsWith("https://") ? candidateNotif : "";

    // Mercado Pago pode REJEITAR back_urls HTTP dependendo da conta/config.
    // Para DEV local, só enviamos back_urls/auto_return quando tivermos URL HTTPS.
    // Se quiser forçar retorno em produção/preview, defina MP_RETURN_BASE_URL (HTTPS).
    const returnBaseUrl = (process.env.MP_RETURN_BASE_URL || "").trim();
    const safeReturnBase = (returnBaseUrl.startsWith("https://") ? returnBaseUrl : "") || (baseUrl.startsWith("https://") ? baseUrl : "");
    const allowAutoReturn = safeReturnBase.startsWith("https://");

    const prefBody: any = {
      items: [
        {
          id: "CAPITAL_COINS",
          title: "Capital Coins",
          quantity: coins,
          unit_price: Number((coinPriceCents / 100).toFixed(2)),
          currency_id: "BRL",
        },
      ],
      external_reference: purchase.id,
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      ...(safeReturnBase
        ? {
            back_urls: {
              success: `${safeReturnBase}/account/purchases`,
              pending: `${safeReturnBase}/account/purchases`,
              failure: `${safeReturnBase}/account/purchases`,
            },
          }
        : {}),
    };

    if (allowAutoReturn) {
      prefBody.auto_return = "approved";
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(prefBody),
    });

    const data = await mpRes.json().catch(() => null);
    if (!mpRes.ok || !data?.id) {
      await audit("payment.mp.preference.failed", "Purchase", purchase.id, { coins, status: mpRes.status, mp: data });
      return NextResponse.json({ message: "Falha ao criar preferência no Mercado Pago.", status: mpRes.status, details: data }, { status: 502 });
    }

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { externalId: data.id, meta: JSON.stringify({ type: "COINS", coins, preferenceId: data.id }) },
    });

    await audit("payment.mp.preference.created", "Purchase", purchase.id, { type: "COINS", coins, preferenceId: data.id });

    const initPoint = data.init_point || data.sandbox_init_point;
    if (!initPoint) return NextResponse.json({ message: "Preferência criada, mas sem init_point." }, { status: 502 });

    return NextResponse.redirect(initPoint);
  }



  // Compra de Produto (SKU fixo)

  const sku = String(form.get("sku") || "");
  if (sku === "CAPITAL_COINS") return NextResponse.json({ message: "Para comprar Capital Coins, use a caixa de coins (quantidade) no topo da Loja." }, { status: 400 });

  if (!sku) return NextResponse.json({ message: "Produto inválido." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { sku }, select: { id: true, sku: true, name: true, priceCents: true, durationDays: true, grantPoints: true, grantVipRole: true, mtaActions: true, isActive: true } });
  if (!product || !product.isActive) return NextResponse.json({ message: "Produto indisponível." }, { status: 400 });
  const amountCentsBase = product.priceCents;
  const { finalCents: amountCents, discountCents } = applyCouponToAmount(amountCentsBase, coupon);

  const accessToken = await (await import("@/lib/settings")).getMpAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Mercado Pago não configurado (MP_ACCESS_TOKEN vazio)." }, { status: 400 });
  }

  // Purchase local
  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      provider: "MERCADOPAGO",
      status: "PENDING",
      amountCents,
      currency: "BRL",
      meta: JSON.stringify({ sku: product.sku, couponCode: coupon?.code || null, discountCents: discountCents || 0 }),
    },
    select: { id: true },
  });

  await prisma.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      priceCents: amountCents,
      durationDays: product.durationDays,
      grantPoints: product.grantPoints,
      grantVipRole: product.grantVipRole,
      // No schema SQLite este campo é String (JSON serializado). No Postgres é Json.
      // Mantemos compatível com ambos.
      mtaActions: product.mtaActions as any,
    },
  });

  // Base URL / URLs de retorno
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const origin = req.headers.get("origin") || "";
  const pick = (v: string) => {
    const s = (v || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return "https://" + s.replace(/^\/+/, "");
  };
  baseUrl = (pick(baseUrl) || pick(origin) || "http://localhost:3000").replace(/\/+$/, "");

  // O Mercado Pago costuma REJEITAR notification_url que não seja HTTPS.
  // Para ambiente local, deixe MP_NOTIFICATION_URL apontando para um endpoint público (ngrok/Vercel),
  // ou então omitimos notification_url e o status será atualizado via retorno + polling no painel.
  const envNotif = (process.env.MP_NOTIFICATION_URL || "").trim();
  const fallbackNotif = `${baseUrl}/api/payments/mercadopago/webhook`;
  const candidateNotif = envNotif || fallbackNotif;
  const notificationUrl = candidateNotif.startsWith("https://") ? candidateNotif : "";

  // Mercado Pago pode REJEITAR back_urls HTTP dependendo da conta/config.
  // Para DEV local, só enviamos back_urls/auto_return quando tivermos URL HTTPS.
  // Se quiser forçar retorno em produção/preview, defina MP_RETURN_BASE_URL (HTTPS).
  const returnBaseUrl = (process.env.MP_RETURN_BASE_URL || "").trim();
  const safeReturnBase = (returnBaseUrl.startsWith("https://") ? returnBaseUrl : "") || (baseUrl.startsWith("https://") ? baseUrl : "");
  const allowAutoReturn = safeReturnBase.startsWith("https://");

  // Cria preferência via API (fetch)
  const prefBody: any = {
    items: [
      {
        id: sku,
        title: product.name,
        quantity: 1,
        unit_price: Number((amountCents / 100).toFixed(2)),
        currency_id: "BRL",
      },
    ],
    external_reference: purchase.id,
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    ...(safeReturnBase
      ? {
          back_urls: {
            success: `${safeReturnBase}/account/purchases`,
            pending: `${safeReturnBase}/account/purchases`,
            failure: `${safeReturnBase}/account/purchases`,
          },
        }
      : {}),
  };

  if (allowAutoReturn) {
    prefBody.auto_return = "approved";
  }

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(prefBody),
  });

  const data = await mpRes.json().catch(() => null);
  if (!mpRes.ok || !data?.id) {
    await audit("payment.mp.preference.failed", "Purchase", purchase.id, { sku, status: mpRes.status, mp: data });
    return NextResponse.json({ message: "Falha ao criar preferência no Mercado Pago.", status: mpRes.status, details: data }, { status: 502 });
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { externalId: data.id, meta: JSON.stringify({ sku, preferenceId: data.id }) },
  });

  await audit("payment.mp.preference.created", "Purchase", purchase.id, { sku, preferenceId: data.id });

  // Redireciona para o checkout
  const initPoint = data.init_point || data.sandbox_init_point;
  if (!initPoint) return NextResponse.json({ message: "Preferência criada, mas sem init_point." }, { status: 502 });

  return NextResponse.redirect(initPoint);
}
