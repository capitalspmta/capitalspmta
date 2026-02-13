import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function WhitelistPage() {
  const user = await requireUser();

  const config = await prisma.whitelistConfig.findUnique({ where: { id: "singleton" } });
  const game = await prisma.gameAccount.findUnique({ where: { userId: user.id } });

  // Antes de iniciar a WL, exige serial
  if (!game) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Vincular Serial do MTA</h1>
        <p className="mt-2 text-white/70">Antes de fazer a whitelist, você precisa vincular o serial do MTA (pra liberar automaticamente após aprovação).</p>
        <form className="mt-4 space-y-3" method="post" action="/api/account/mta/link">
          <label className="block text-sm text-white/70">Serial do MTA</label>
          <input name="mtaSerial" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" placeholder="Cole o serial aqui" required />
          <label className="block text-sm text-white/70">Conta no MTA (opcional)</label>
          <input name="mtaAccount" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" placeholder="Nome da conta no MTA (se tiver)" />
          <button className="w-full rounded-xl bg-white text-black py-2 font-semibold">Vincular</button>
        </form>
      </div>
    );
  }

  if (!config?.enabled) {
    return <div className="max-w-xl mx-auto p-6"><h1 className="text-2xl font-semibold">Whitelist</h1><p className="mt-2 text-white/70">Whitelist está desativada no momento.</p></div>;
  }
  if (config.pausedUntil && new Date(config.pausedUntil) > new Date()) {
    return <div className="max-w-xl mx-auto p-6"><h1 className="text-2xl font-semibold">Whitelist</h1><p className="mt-2 text-white/70">Whitelist em pausa até {new Date(config.pausedUntil).toLocaleString()}.</p></div>;
  }

  const questions = await prisma.whitelistQuestion.findMany({ orderBy: { order: "asc" } });
  const lastApp = await prisma.whitelistApplication.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

  if (user.whitelistStatus === "APPROVED") {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">{config.successTitle}</h1>
        <p className="mt-2 text-white/70">{config.successBody}</p>
        <p className="mt-4 text-white/70">Seu serial vinculado: <span className="text-white">{game.mtaSerial}</span></p>
      </div>
    );
  }

  if (lastApp?.status === "PENDING") {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Whitelist enviada</h1>
        <p className="mt-2 text-white/70">Sua whitelist está em análise. Aguarde um staff aprovar ou reprovar.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Whitelist</h1>
      <p className="mt-2 text-white/70">Responda com atenção. Seu serial já está vinculado e será liberado automaticamente quando sua whitelist for aprovada.</p>

      <form className="mt-6 space-y-4" method="post" action="/api/whitelist/submit">
        {questions.map((q) => (
          <div key={q.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-semibold">{q.prompt}{q.required ? " *" : ""}</label>
            <textarea name={`q_${q.id}`} required={q.required} className="mt-2 w-full min-h-[90px] rounded-xl bg-black/30 border border-white/10 px-3 py-2" />
          </div>
        ))}
        <button className="w-full rounded-xl bg-white text-black py-3 font-semibold">Enviar whitelist</button>
      </form>
    </div>
  );
}
