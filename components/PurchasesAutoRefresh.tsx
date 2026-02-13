"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

/**
 * Mercado Pago pode redirecionar o usuário de volta antes do webhook finalizar.
 * Este componente força refresh da página por um curto período quando detecta parâmetros de retorno do MP.
 */
export default function PurchasesAutoRefresh() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/account/purchases") return;

    const hasMpParams =
      !!sp.get("payment_id") ||
      !!sp.get("collection_id") ||
      !!sp.get("collection_status") ||
      !!sp.get("status") ||
      !!sp.get("external_reference") ||
      !!sp.get("preference_id") ||
      !!sp.get("merchant_order_id");

    // 1) Se o usuário voltou do MP, sincroniza/agiliza por 60s.
    // 2) Mesmo sem retorno, mantém um sync leve por um tempo para aprovar automaticamente em ambiente local
    //    (sem depender de webhook público).

    const runForMs = hasMpParams ? 60_000 : 120_000;
    const stepMs = hasMpParams ? 3_000 : 10_000;
    let elapsed = 0;

    const tick = async () => {
      try {
        const res = await fetch("/api/payments/mercadopago/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const j = await res.json().catch(() => null);
        if (j?.updatedCount > 0) router.refresh();
        // Se não há pendentes, pode parar mais cedo.
        if (j?.pendingCount === 0) {
          elapsed = runForMs;
        }
      } catch {
        // ignore
      }
    };

    // primeira tentativa rápida
    const t0 = setTimeout(() => {
      tick();
      router.refresh();
    }, 600);

    const t = setInterval(() => {
      elapsed += stepMs;
      tick();
      if (elapsed >= runForMs) clearInterval(t);
    }, stepMs);

    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [pathname, sp, router]);

  return null;
}
