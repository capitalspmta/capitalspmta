import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PendingTicketGate from "@/components/PendingTicketGate";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site-config";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }

  return (
    <div className="bg-gta min-h-screen">
      <div className="relative z-10 min-h-screen flex">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col">
          <Topbar user={user} />
          <PendingTicketGate />
          <main className="px-4 py-6 max-w-5xl w-full mx-auto">{children}</main>
          <footer className="px-4 py-6 text-center text-xs text-white/35 border-t border-white/10 bg-black/10">
            © {new Date().getFullYear()} {SITE.name} • {SITE.tagline}
          </footer>
        </div>
      </div>
    </div>
  );
}
