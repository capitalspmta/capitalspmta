import { BRAND } from "@/lib/site-config";

export default function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 grid place-items-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2l8.5 5v10L12 22 3.5 17V7L12 2z" stroke="white" strokeOpacity="0.75" strokeWidth="1.5" />
          <path d="M12 6l5 3v6l-5 3-5-3V9l5-3z" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{BRAND.primaryLabel}</div>
        <div className="text-xs text-white/45">{BRAND.secondaryLabel}</div>
      </div>
    </div>
  );
}
