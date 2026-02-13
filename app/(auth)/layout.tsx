import Brand from "@/components/Brand";
import { SITE } from "@/lib/site-config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gta min-h-screen">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="hidden lg:block">
            <Brand />
            <h1 className="mt-10 text-4xl font-semibold tracking-tight">{SITE.name}</h1>
            <p className="mt-4 text-white/55 leading-relaxed max-w-md">{SITE.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Fórum</span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Tickets</span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Logs</span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">Loja</span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <div className="lg:hidden mb-6"><Brand /></div>
              {children}
              <footer className="mt-6 flex items-center justify-center gap-4 text-xs text-white/45">
                <a href="#" className="hover:text-white/70">Privacidade</a>
                <span className="opacity-40">•</span>
                <a href="#" className="hover:text-white/70">Termos</a>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
