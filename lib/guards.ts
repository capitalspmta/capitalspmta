import { redirect } from "next/navigation";
import { requireUser } from "./auth";

/**
 * Aplica regras globais de acesso:
 * - conta banida (bannedUntil)
 * - whitelist pendente (whitelistStatus != APPROVED) => só pode ver /whitelist, /account e rotas /admin (staff)
 */
export async function requireActiveUser(opts?: { allowWhitelist?: boolean; allowAccount?: boolean; allowAdmin?: boolean }) {
  const user = await requireUser();

  if (user.bannedUntil) {
    const until = new Date(user.bannedUntil);
    if (until.getTime() > Date.now()) {
      redirect(`/blocked?until=${encodeURIComponent(until.toISOString())}`);
    }
  }

  // whitelist: se pendente, limita navegação
  if (user.whitelistStatus && user.whitelistStatus !== "APPROVED") {
    const allowWhitelist = opts?.allowWhitelist ?? false;
    const allowAccount = opts?.allowAccount ?? false;
    const allowAdmin = opts?.allowAdmin ?? false;

    // páginas que chamam requireActiveUser podem setar allowWhitelist/allowAccount
    if (!allowWhitelist && !allowAccount && !allowAdmin) {
      redirect("/whitelist");
    }
  }

  return user;
}
