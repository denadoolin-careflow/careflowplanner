import { cn } from "@/lib/utils";

interface Props {
  isEmpty: boolean;
  count?: number;
  className?: string;
}

import { useEffect, useRef, useState } from "react";

/**
 * "Radiant exhale" inbox illustration.
 * Up to 3 stacked papers physically lift off the tray as `count` drops.
 * Each removal triggers a one-shot exhale (rise + scale + blur out) on the
 * top paper, with a sparkle bloom emitted from the dissolution point.
 * When the inbox reaches zero, a final sparkle bloom + halo cooldown plays.
 */
export function InboxIllustration({ isEmpty, count = 0, className }: Props) {
  const visible = Math.min(3, Math.max(0, count));
  const prevRef = useRef(visible);
  // Trigger key — bumps every time count drops, so the exhale keyframe replays.
  const [exhaleKey, setExhaleKey] = useState(0);
  const [bloomKey, setBloomKey] = useState(0);

  useEffect(() => {
    if (visible < prevRef.current) setExhaleKey((k) => k + 1);
    prevRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (isEmpty) setBloomKey((k) => k + 1);
  }, [isEmpty]);

  // Paper visual configs — bottom to top.
  const papers = [
    {
      bg: "bg-[hsl(var(--warm-soft))]",
      border: "border-[hsl(var(--warm)/0.35)]",
      line: "bg-[hsl(var(--warm)/0.4)]",
      rotate: "-rotate-6",
      offsetY: "translate-y-3",
      offsetX: "-translate-x-2",
    },
    {
      bg: "bg-[hsl(var(--accent-soft))]",
      border: "border-[hsl(var(--accent)/0.3)]",
      line: "bg-[hsl(var(--accent)/0.4)]",
      rotate: "rotate-3",
      offsetY: "translate-y-1",
      offsetX: "translate-x-2",
    },
    {
      bg: "bg-card",
      border: "border-border/60",
      line: "bg-[hsl(var(--primary)/0.35)]",
      rotate: "-rotate-2",
      offsetY: "translate-y-0",
      offsetX: "translate-x-0",
    },
  ];

  return (
    <div
      className={cn(
        "relative mx-auto h-40 w-40 select-none sm:h-44 sm:w-44 md:h-52 md:w-52",
        className,
      )}
      aria-hidden
    >
      {/* Atmospheric halo — warm when holding, cools to sage when cleared */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-all duration-[1200ms] ease-out animate-[inbox-halo_5s_ease-in-out_infinite]",
          isEmpty
            ? "bg-[hsl(150_55%_72%/0.5)] scale-110"
            : "bg-[hsl(28_85%_78%/0.45)] scale-100",
        )}
      />

      {/* Paper stack */}
      <div className="absolute inset-0 flex items-end justify-center pb-14">
        <div className="relative h-24 w-28">
          {papers.map((p, i) => {
            const present = i < visible;
            // The "exhaling" paper is the one that was just removed (index === visible).
            const isExhaling = i === visible && i < 3;
            return (
              <div
                key={isExhaling ? `exhale-${exhaleKey}-${i}` : `paper-${i}`}
                className={cn(
                  "absolute inset-x-0 mx-auto flex h-16 w-24 flex-col gap-1.5 rounded-lg border p-2 shadow-md",
                  p.bg,
                  p.border,
                  p.rotate,
                  p.offsetX,
                  // Stack offset so they appear layered
                  "transition-all duration-700 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
                  present &&
                    "opacity-100 animate-[inbox-float_5s_ease-in-out_infinite]",
                  !present && !isExhaling && "opacity-0 pointer-events-none",
                  isExhaling &&
                    "animate-[inbox-exhale_1100ms_cubic-bezier(0.4,0,0.2,1)_forwards] pointer-events-none",
                )}
                style={{
                  bottom: `${i * 6}px`,
                  zIndex: 10 + i,
                  animationDelay: present ? `${i * 0.4}s` : undefined,
                }}
              >
                <div className={cn("h-1 w-3/4 rounded-full", p.line)} />
                <div className={cn("h-1 w-1/2 rounded-full opacity-70", p.line)} />
                <div className={cn("h-1 w-2/3 rounded-full opacity-50", p.line)} />
              </div>
            );
          })}

          {/* Sparkle bloom — fires on each paper exhale */}
          <svg
            key={`exhale-bloom-${exhaleKey}`}
            className="pointer-events-none absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2 animate-[inbox-bloom_1100ms_cubic-bezier(0.4,0,0.2,1)_forwards]"
            viewBox="0 0 100 100"
          >
            <circle cx="20" cy="30" r="2" className="fill-[hsl(var(--warm))]" />
            <circle cx="80" cy="40" r="1.5" className="fill-[hsl(var(--accent))]" />
            <circle cx="50" cy="15" r="2.5" className="fill-[hsl(var(--warm)/0.7)]" />
            <circle cx="15" cy="60" r="1.2" className="fill-[hsl(var(--primary))]" />
            <circle cx="85" cy="65" r="1.8" className="fill-[hsl(var(--accent)/0.8)]" />
            <path
              d="M50 35 L52 42 L59 42 L53 46 L55 53 L50 49 L45 53 L47 46 L41 42 L48 42 Z"
              className="fill-[hsl(var(--warm)/0.85)]"
            />
          </svg>
        </div>
      </div>

      {/* Frosted tray */}
      <div
        className={cn(
          "absolute bottom-4 left-1/2 z-0 flex h-10 w-40 -translate-x-1/2 items-center justify-center rounded-2xl border border-border/60 bg-card/70 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.5)] backdrop-blur-md transition-all duration-700 animate-[inbox-tray_4s_ease-in-out_infinite]",
          isEmpty && "shadow-[0_18px_40px_-18px_hsl(150_60%_45%/0.45)]",
        )}
      >
        <div className="h-1 w-28 rounded-full bg-muted/70" />
      </div>

      {/* Final empty-state sparkle bloom — louder, larger */}
      <div
        key={`empty-bloom-${bloomKey}`}
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700",
          isEmpty ? "opacity-100" : "opacity-0",
        )}
      >
        <svg
          className="h-32 w-32 animate-[inbox-bloom_1800ms_cubic-bezier(0.4,0,0.2,1)_forwards]"
          viewBox="0 0 100 100"
        >
          <circle cx="20" cy="20" r="2.2" className="fill-[hsl(var(--warm))]" />
          <circle cx="80" cy="30" r="1.6" className="fill-[hsl(var(--accent))]" />
          <circle cx="50" cy="10" r="2.8" className="fill-[hsl(var(--warm)/0.7)]" />
          <circle cx="10" cy="60" r="1.4" className="fill-[hsl(var(--primary))]" />
          <circle cx="90" cy="70" r="2.2" className="fill-[hsl(var(--accent)/0.8)]" />
          <circle cx="35" cy="85" r="1.6" className="fill-[hsl(var(--warm))]" />
          <circle cx="70" cy="88" r="1.2" className="fill-[hsl(var(--primary)/0.8)]" />
          <path
            d="M50 40 L52 47 L60 47 L53 51 L56 59 L50 54 L44 59 L47 51 L40 47 L48 47 Z"
            className="fill-[hsl(var(--warm)/0.9)]"
          />
        </svg>
      </div>

      <style>{`
        @keyframes inbox-float {
          0%, 100% { transform: translateY(0) rotate(var(--tw-rotate,0)); }
          50% { transform: translateY(-4px) rotate(var(--tw-rotate,0)); }
        }
        @keyframes inbox-exhale {
          0%   { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
          30%  { transform: translateY(-14px) scale(1.06); opacity: 0.85; filter: blur(1px); }
          100% { transform: translateY(-72px) scale(1.45); opacity: 0; filter: blur(14px); }
        }
        @keyframes inbox-bloom {
          0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scale(1.6) rotate(90deg); opacity: 0; }
        }
        @keyframes inbox-halo {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes inbox-tray {
          0%, 100% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.02); }
        }
      `}</style>
    </div>
  );
}