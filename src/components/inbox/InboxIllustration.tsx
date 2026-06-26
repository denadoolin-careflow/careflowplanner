import { cn } from "@/lib/utils";

interface Props {
  isEmpty: boolean;
  count?: number;
  className?: string;
}

/**
 * Atmospheric inbox hero illustration.
 * - Full state: three soft "paper" cards stacked above a frosted tray, gently floating.
 * - Empty state: papers lift away & dissolve; warm halo cools and a sparkle cluster settles in.
 * Pure Tailwind + inline SVG; uses semantic tokens so it follows the active atmosphere.
 */
export function InboxIllustration({ isEmpty, className }: Props) {
  return (
    <div
      className={cn(
        "relative mx-auto h-40 w-40 select-none sm:h-44 sm:w-44 md:h-52 md:w-52",
        className,
      )}
      aria-hidden
    >
      {/* Atmospheric halo */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-all duration-[1200ms] ease-out",
          isEmpty
            ? "bg-[hsl(150_50%_75%/0.45)] scale-110"
            : "bg-[hsl(28_85%_78%/0.45)] scale-100",
        )}
      />

      {/* Paper stack — full state */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-end pb-14 transition-all duration-700",
          "[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
          isEmpty
            ? "opacity-0 -translate-y-6 scale-75 pointer-events-none blur-sm"
            : "opacity-100 translate-y-0 scale-100",
        )}
      >
        {/* Paper 1 */}
        <div
          className={cn(
            "h-14 w-24 -rotate-6 -translate-x-2 rounded-lg border border-[hsl(var(--warm)/0.35)] bg-[hsl(var(--warm-soft))] shadow-sm",
            "flex items-center justify-center",
            !isEmpty && "animate-[inbox-drift_5s_ease-in-out_infinite]",
          )}
        >
          <div className="h-1 w-14 rounded-full bg-[hsl(var(--warm)/0.35)]" />
        </div>

        {/* Paper 2 */}
        <div
          className={cn(
            "-mt-7 flex h-16 w-28 translate-x-2 rotate-3 flex-col gap-1.5 rounded-lg border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent-soft))] p-3 shadow-md",
            !isEmpty && "animate-[inbox-drift_6s_ease-in-out_infinite_0.3s]",
          )}
        >
          <div className="h-1 w-full rounded-full bg-[hsl(var(--accent)/0.4)]" />
          <div className="h-1 w-2/3 rounded-full bg-[hsl(var(--accent)/0.3)]" />
        </div>

        {/* Sticky note */}
        <div
          className={cn(
            "-mt-8 flex h-20 w-20 -rotate-2 flex-col gap-1.5 rounded-md border border-border/60 bg-card p-3 shadow-lg",
            !isEmpty && "animate-[inbox-float_4.5s_ease-in-out_infinite]",
          )}
        >
          <div className="mb-0.5 h-3 w-3 rounded-full bg-[hsl(var(--primary)/0.35)]" />
          <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
          <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
          <div className="h-1 w-3/4 rounded-full bg-muted-foreground/15" />
        </div>
      </div>

      {/* Frosted tray */}
      <div
        className={cn(
          "absolute bottom-4 left-1/2 z-10 flex h-12 w-40 -translate-x-1/2 items-center justify-center rounded-2xl border border-border/60 bg-card/70 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.5)] backdrop-blur-md transition-all duration-700",
          isEmpty && "shadow-[0_18px_40px_-18px_hsl(150_60%_45%/0.45)]",
        )}
      >
        <div className="h-1 w-28 rounded-full bg-muted/70" />

        {/* Sparkles — empty state */}
        <div
          className={cn(
            "pointer-events-none absolute -top-10 inset-x-0 flex justify-center transition-all duration-700 delay-300",
            isEmpty ? "opacity-100 scale-100" : "opacity-0 scale-50",
          )}
        >
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-300/80 blur-[1px]" />
          <span className="absolute -top-3 left-6 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400/80" />
          <span className="absolute -top-1 right-6 h-2 w-2 animate-pulse rounded-full bg-amber-300/80 [animation-delay:300ms]" />
          <svg
            className="absolute -top-6 left-1/2 -translate-x-1/2 h-4 w-4 text-amber-400/80 animate-[inbox-twinkle_3s_ease-in-out_infinite]"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
          </svg>
        </div>
      </div>

      {/* Keyframes (scoped, safe to repeat — Tailwind dedupes inline <style>) */}
      <style>{`
        @keyframes inbox-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes inbox-drift {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate,0)); }
          50% { transform: translateY(-3px) rotate(var(--tw-rotate,0)); }
        }
        @keyframes inbox-twinkle {
          0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(0.9) rotate(0deg); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1) rotate(20deg); }
        }
      `}</style>
    </div>
  );
}