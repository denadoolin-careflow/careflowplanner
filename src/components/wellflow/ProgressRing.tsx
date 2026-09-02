import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/** Calm circular progress indicator. Sage fill, gold as the goal nears.
 *  Tapping gives a soft pop + haptic; the water ring fills with a wave. */
export function ProgressRing({
  label, value, goal, unit = "", size = 84, className, variant = "ring", onTap,
}: {
  label: string;
  value: number;
  goal: number | null;
  unit?: string;
  size?: number;
  className?: string;
  /** "water" adds a rising liquid fill inside the ring. */
  variant?: "ring" | "water";
  onTap?: () => void;
}) {
  const pct = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const near = pct >= 0.85;
  const fmt = (v: number) => (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString();

  /* Animate from 0 → pct on mount and whenever the value changes. */
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const [pop, setPop] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const tap = () => {
    haptics.pickup();
    setPop(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPop(false), 420);
    onTap?.();
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const clipId = `wf-fill-${label.replace(/\W/g, "")}`;
  const interactive = !!onTap;

  const body = (
    <>
      <div
        className={cn(
          "relative transition-transform duration-300 ease-out",
          pop && "scale-[1.08]",
        )}
        style={{ width: size, height: size }}
      >
        {variant === "water" && (
          <div className="pointer-events-none absolute inset-[7px] overflow-hidden rounded-full">
            <div
              className="absolute inset-x-0 bottom-0 bg-primary/20 transition-[height] duration-700 ease-out"
              style={{ height: `${shown * 100}%` }}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1.5 rounded-full bg-primary/30", pop && "animate-pulse")} />
            </div>
          </div>
        )}
        <svg width={size} height={size} className="relative -rotate-90" role="img"
             aria-label={`${label}: ${fmt(value)}${unit}${goal ? ` of ${fmt(goal)}${unit}` : ""}`}>
          <defs><clipPath id={clipId} /></defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                  className="stroke-muted" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            className={cn("transition-[stroke-dashoffset] duration-700 ease-out", near ? "stroke-accent" : "stroke-primary")}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - shown)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center leading-tight">
          <div>
            <div className="text-sm font-semibold tabular-nums">{fmt(value)}</div>
            {goal ? (
              <div className="text-[10px] text-muted-foreground tabular-nums">/ {fmt(goal)}{unit}</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">no goal</div>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </>
  );

  if (!interactive) {
    return <div className={cn("flex flex-col items-center gap-1.5", className)}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={tap}
      data-no-haptic
      aria-label={`${label} — tap to log`}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl p-1 transition-colors active:bg-muted/40",
        className,
      )}
    >
      {body}
    </button>
  );
}
