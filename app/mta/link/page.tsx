import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MtaLinkPage({ searchParams }: { searchParams: { serial?: string } }) {
  const serial = (searchParams?.serial || "").trim();
  if (!serial) return redirect("/");

  const user = await getSessionUser();
  if (!user) {
    // Send to login, keep redirect
    return redirect(`/login?next=/mta/link?serial=${encodeURIComponent(serial)}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mtaSerial: serial }
  });

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Vinculado com sucesso</h1>
      <p className="mt-2 text-sm opacity-80">
        Seu serial do MTA foi vinculado à sua conta. Agora você pode tentar entrar no servidor novamente.
      </p>
      <div className="mt-4 rounded-lg border p-3 text-sm">
        <div><b>Usuário:</b> {user.username}</div>
        <div><b>Serial:</b> {serial}</div>
      </div>
    </main>
  );
}
