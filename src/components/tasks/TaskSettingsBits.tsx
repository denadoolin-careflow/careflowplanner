import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const TONE_BG: Record<string, string> = {
  primary: "bg-primary/12 text-primary",
  violet: "bg-violet-500/12 text-violet-500",
  amber: "bg-amber-500/15 text-amber-600",
  indigo: "bg-indigo-500/12 text-indigo-500",
  teal: "bg-teal-500/12 text-teal-600",
  pink: "bg-pink-500/12 text-pink-500",
  rose: "bg-rose-500/12 text-rose-500",
  emerald: "bg-emerald-500/12 text-emerald-600",
};

export type ToneKey = keyof typeof TONE_BG;

export function SectionLabel({ icon, label, className }: { icon?: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={cn("mt-5 mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {icon} {label}
    </div>
  );
}

type BigCardProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> & {
  icon: React.ReactNode;
  label: string;
  value?: string;
  tone?: ToneKey | string;
  extra?: React.ReactNode;
  valueTone?: string;
};

export const BigCard = React.forwardRef<HTMLButtonElement, BigCardProps>(function BigCard(
  { icon, label, value, tone = "primary", extra, valueTone, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "relative flex min-h-[104px] w-full flex-col rounded-2xl border border-border/50 bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.985] hover:border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-full", TONE_BG[tone as string] ?? TONE_BG.primary)}>
          {icon}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/70">{label}</p>
      {value !== undefined && (
        <p className={cn("mt-0.5 truncate text-[15px] font-semibold",
          valueTone === "indigo" ? "text-indigo-500" : "text-foreground")}>{value}</p>
      )}
      {children}
      {extra}
    </button>
  );
});

export function SmallTile({
  icon, label, onClick, tone = "teal", danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: ToneKey;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[56px] items-center gap-2 rounded-2xl border bg-card px-3 text-left shadow-sm transition-transform active:scale-[0.985] hover:border-border",
        danger ? "border-rose-500/25 bg-rose-500/8 text-rose-500" : "border-border/50",
      )}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full",
        danger ? "bg-rose-500/15 text-rose-500" : TONE_BG[tone])}>{icon}</span>
      <span className="flex-1 truncate text-[13px] font-medium">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
    </button>
  );
}