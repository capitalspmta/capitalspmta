import clsx from "clsx";

export function cn(...c: Array<string | undefined | null | false>) {
  return clsx(c);
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("glass shadow-soft rounded-2xl", className)} />;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-60 disabled:cursor-not-allowed";
  const v =
    variant === "primary"
      ? "bg-white text-black hover:bg-white/90"
      : variant === "danger"
      ? "bg-red-500/90 text-white hover:bg-red-500"
      : "bg-white/10 text-white hover:bg-white/15 border border-white/10";
  return <button {...props} className={cn(base, v, className)} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-white/20",
        className
      )}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full min-h-[120px] rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-white/20",
        className
      )}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("text-sm font-medium text-white/80", className)} />;
}

export function Badge({
  children,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
}) {
  const v =
    variant === "ghost"
      ? "border-white/10 bg-transparent text-white/70"
      : variant === "danger"
        ? "border-red-500/20 bg-red-500/10 text-red-200"
        : "border-white/10 bg-white/5 text-white/70";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${v} ${className}`}>
      {children}
    </span>
  );
}

export function Divider({ text = "ou" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs text-white/40">{text}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
