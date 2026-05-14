import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * AuroraClock — analog + digital readout with a soft aurora glow.
 * Designed to sit on the right side of a date hero.
 */
export function AuroraClock({ className }: { className?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const hourDeg = ((h % 12) + m / 60) * 30;
  const minDeg = (m + s / 60) * 6;
  const secDeg = s * 6;

  const time = useMemo(() => format(now, "h:mm"), [now]);
  const ampm = useMemo(() => format(now, "a"), [now]);
  const sub  = useMemo(() => format(now, "EEE • MMM d"), [now]);

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Analog face */}
      <div className="relative h-24 w-24 shrink-0">
        {/* aurora halo */}
        <div
          aria-hidden
          className="absolute -inset-2 rounded-full opacity-70 blur-xl"
          style={{
            background:
              "conic-gradient(from 0deg, hsl(var(--primary)/0.35), hsl(var(--moon, var(--primary))/0.25), hsl(var(--primary)/0.35))",
          }}
        />
        <div className="clock-glow relative flex h-24 w-24 items-center justify-center rounded-full border border-border/60 bg-card/70 backdrop-blur">
          {/* tick marks */}
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1 h-1.5 w-px -translate-x-1/2 bg-foreground/40"
              style={{ transform: `translateX(-50%) rotate(${i * 30}deg)`, transformOrigin: "50% 46px" }}
            />
          ))}
          {/* hour */}
          <span
            className="absolute left-1/2 top-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-full rounded-full bg-foreground"
            style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`, transformOrigin: "50% 100%" }}
          />
          {/* minute */}
          <span
            className="absolute left-1/2 top-1/2 h-9 w-[2px] -translate-x-1/2 -translate-y-full rounded-full bg-foreground/85"
            style={{ transform: `translate(-50%, -100%) rotate(${minDeg}deg)`, transformOrigin: "50% 100%" }}
          />
          {/* second */}
          <span
            className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-full rounded-full bg-primary transition-transform duration-150 ease-out"
            style={{ transform: `translate(-50%, -100%) rotate(${secDeg}deg)`, transformOrigin: "50% 100%" }}
          />
          <span className="absolute h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
        </div>
      </div>

      {/* Digital readout */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1.5 font-display tabular-nums">
          <span className="text-gradient-glow text-4xl font-semibold sm:text-5xl">{time}</span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{ampm}</span>
        </div>
        <span className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}