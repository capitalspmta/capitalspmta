
import { prisma } from "@/lib/prisma";

export default async function TermsPage() {
  const row = await prisma.siteSetting.findUnique({ where: { key: "terms_markdown" } });
  const md = row?.value || "Termos ainda não definidos.";
  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Termos do Site</h1>
      <div className="prose prose-invert mt-4 max-w-none whitespace-pre-wrap text-white/80">
        {md}
      </div>
    </div>
  );
}
