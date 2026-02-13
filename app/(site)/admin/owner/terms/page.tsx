
import { requireActiveUser } from "@/lib/guards";
import { hasAtLeast } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function TermsAdminPage() {
  const user = await requireActiveUser();
  if (!hasAtLeast(user as any, "OWNER" as any)) {
    return <div className="text-white/70">Acesso negado.</div>;
  }
  const row = await prisma.siteSetting.findUnique({ where: { key: "terms_markdown" } });
  const md = row?.value || "";
  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Editar termos</h1>
      <p className="mt-2 text-white/55 text-sm">Você pode editar a qualquer momento. Suporta texto simples (markdown básico).</p>

      <form action="/api/admin/settings/terms" method="post" className="mt-4 space-y-3" data-json>
        <textarea name="markdown" defaultValue={md} className="w-full min-h-[320px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/85 outline-none" />
        <button className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2">Salvar</button>
      </form>

      <div className="mt-4 text-xs text-white/45">Dica: para ver como fica, abra <span className="underline">/terms</span>.</div>
    </div>
  );
}
