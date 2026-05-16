import { useEffect, useState, useMemo, memo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/** Inner ticker — re-renders only the rotating hands every second.
 *  Keeps the parent (and the surrounding hero) from re-rendering. */
const ClockHands = memo(function ClockHands() {
  const [now, setNow] = useState(() => new Date());
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
  return (
    <>
      <span
        className="absolute left-1/2 top-1/2 h-7 w-[3px] -translate-x-1/2 -translate-y-full rounded-full bg-foreground"
        style={{ transform: `translate(-50%, -100%) rotate(${hourDeg}deg)`, transformOrigin: "50% 100%" }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-9 w-[2px] -translate-x-1/2 -translate-y-full rounded-full bg-foreground/85"
        style={{ transform: `translate(-50%, -100%) rotate(${minDeg}deg)`, transformOrigin: "50% 100%" }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-full rounded-full bg-primary"
        style={{ transform: `translate(-50%, -100%) rotate(${secDeg}deg)`, transformOrigin: "50% 100%" }}
      />
    </>
  );
});

/** Minute-resolution digital readout — re-renders at most once per minute. */
const DigitalReadout = memo(function DigitalReadout() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Align to top of the next minute, then tick every 60s.
    const msToNextMin = 60_000 - (Date.now() % 60_000);
    const t = setTimeout(() => {
      setNow(new Date());
      const id = setInterval(() => setNow(new Date()), 60_000);
      (t as any)._id = id;
    }, msToNextMin);
    return () => {
      clearTimeout(t);
      const id = (t as any)._id;
      if (id) clearInterval(id);
    };
  }, []);
  const time = useMemo(() => format(now, "h:mm"), [now]);
  const ampm = useMemo(() => format(now, "a"), [now]);
  const sub  = useMemo(() => format(now, "EEE • MMM d"), [now]);
  return (
    <div className="flex flex-col leading-none">
      <div className="flex items-baseline gap-1.5 font-display tabular-nums">
        <span className="text-gradient-glow text-4xl font-semibold sm:text-5xl">{time}</span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{ampm}</span>
      </div>
      <span className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">{sub}</span>
    </div>
  );
});

/**
 * AuroraClock — analog + digital readout with a soft aurora glow.
 * Memoized so it never re-renders from parent updates; internal tickers
 * are isolated to their own subtrees so the surrounding hero stays still.
 */
export const AuroraClock = memo(function AuroraClock({ className }: { className?: string }) {
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
          <ClockHands />
          <span className="absolute h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
        </div>
      </div>

      <DigitalReadout />
    </div>
  );
});