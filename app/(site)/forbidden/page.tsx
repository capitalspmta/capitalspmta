import Link from "next/link";
import { Card, Button } from "@/components/ui";

export default function Forbidden({ searchParams }: { searchParams?: { need?: string } }) {
  const need = searchParams?.need ?? "permissão";
  return (
    <div className="max-w-xl mx-auto py-14">
      <Card className="p-6 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Acesso negado</h1>
        <p className="text-sm text-white/60">
          Você não tem permissão para acessar esta área. Requisito: <span className="text-white/80">{need}</span>.
        </p>
        <div className="pt-2 flex gap-3">
          <Link href="/forum"><Button>Voltar ao fórum</Button></Link>
          <Link href="/account/profile"><Button variant="ghost">Minha conta</Button></Link>
        </div>
      </Card>
    </div>
  );
}
