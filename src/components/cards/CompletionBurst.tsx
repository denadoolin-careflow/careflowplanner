import { CompletionVisualKey } from "@/lib/completion-visual";

/**
 * Renders the completion visual effect overlaid on a task row.
 * Uses inline keyframes so we don't need to extend tailwind.config.
 */
export function CompletionBurst({ variant }: { variant: CompletionVisualKey }) {
  if (variant === "none") return null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        {variant === "sparkle" && (
          <>
            <span className="absolute inset-y-0 -left-1/3 w-1/2 animate-[task-sweep_900ms_ease-out_forwards] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="animate-ping rounded-full bg-primary/20 px-3 py-1 text-base">✨</span>
            </span>
          </>
        )}

        {variant === "confetti" && (
          <span className="absolute inset-0 grid place-items-center">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-sm"
                style={{
                  background: `hsl(var(${c.color}))`,
                  animation: `cf-confetti 950ms ease-out forwards`,
                  // each particle gets a unique tx/ty/rot via CSS vars
                  ["--tx" as any]: `${c.tx}px`,
                  ["--ty" as any]: `${c.ty}px`,
                  ["--rot" as any]: `${c.rot}deg`,
                  animationDelay: `${c.delay}ms`,
                }}
              />
            ))}
          </span>
        )}

        {variant === "ripple" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="absolute h-6 w-6 rounded-full border-2 border-primary/60 animate-[cf-ripple_900ms_ease-out_forwards]" />
            <span className="absolute h-6 w-6 rounded-full border-2 border-primary/40 animate-[cf-ripple_900ms_ease-out_200ms_forwards]" />
            <span className="absolute h-6 w-6 rounded-full border-2 border-primary/30 animate-[cf-ripple_900ms_ease-out_400ms_forwards]" />
          </span>
        )}

        {variant === "priority" && (
          <span className="absolute inset-0">
            {/* Super glow sweep */}
            <span className="absolute inset-y-0 -left-1/2 w-2/3 animate-[task-sweep_1100ms_ease-out_forwards] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            {/* Enhanced confetti */}
            <span className="absolute inset-0 grid place-items-center">
              {PRIORITY_CONFETTI.map((c, i) => (
                <span
                  key={`cf-${i}`}
                  className="absolute h-2 w-2 rounded-sm"
                  style={{
                    background: `hsl(var(${c.color}))`,
                    animation: `cf-confetti 1200ms ease-out forwards`,
                    ["--tx" as any]: `${c.tx}px`,
                    ["--ty" as any]: `${c.ty}px`,
                    ["--rot" as any]: `${c.rot}deg`,
                    animationDelay: `${c.delay}ms`,
                  }}
                />
              ))}
            </span>
            {/* Rising stars */}
            <span className="absolute inset-0">
              {PRIORITY_STARS.map((s, i) => (
                <span
                  key={`st-${i}`}
                  className="absolute text-lg"
                  style={{
                    left: `${s.left}%`,
                    bottom: "25%",
                    animation: `cf-star 1300ms ease-out forwards`,
                    animationDelay: `${s.delay}ms`,
                    ["--ty" as any]: `${s.ty}px`,
                  }}
                >⭐</span>
              ))}
            </span>
            {/* Bouncy checkmark overlay */}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.6)] animate-[cf-bounce_1000ms_cubic-bezier(.34,1.56,.64,1)_forwards]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
            </span>
          </span>
        )}

        {variant === "glow" && (
          <span className="absolute inset-0 animate-[cf-glow_1000ms_ease-out_forwards] bg-gradient-to-r from-primary/0 via-primary/25 to-primary/0" />
        )}

        {variant === "checkmark" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-glow animate-[cf-bounce_900ms_cubic-bezier(.34,1.56,.64,1)_forwards]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </span>
          </span>
        )}

        {variant === "stars" && (
          <span className="absolute inset-0">
            {STARS.map((s, i) => (
              <span
                key={i}
                className="absolute text-sm"
                style={{
                  left: `${s.left}%`,
                  bottom: "30%",
                  animation: `cf-star 1100ms ease-out forwards`,
                  animationDelay: `${s.delay}ms`,
                  ["--ty" as any]: `${s.ty}px`,
                }}
              >⭐</span>
            ))}
          </span>
        )}
      </span>
    </>
  );
}

const CONFETTI = [
  { tx: -42, ty: -22, rot: -40, delay: 0,   color: "--primary" },
  { tx: -18, ty: -32, rot: -10, delay: 30,  color: "--accent" },
  { tx:   6, ty: -36, rot:  15, delay: 10,  color: "--secondary" },
  { tx:  28, ty: -28, rot:  40, delay: 50,  color: "--primary" },
  { tx:  48, ty: -14, rot:  70, delay: 20,  color: "--accent" },
  { tx: -32, ty:  10, rot:-120, delay: 60,  color: "--secondary" },
  { tx:  34, ty:  14, rot: 110, delay: 70,  color: "--primary" },
];

const STARS = [
  { left: 18, delay:   0, ty: -26 },
  { left: 42, delay:  80, ty: -34 },
  { left: 66, delay: 160, ty: -22 },
  { left: 84, delay: 220, ty: -30 },
];

const KEYFRAMES = `
@keyframes cf-confetti {
  0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; }
}
@keyframes cf-ripple {
  0%   { transform: scale(0.4); opacity: 0.9; }
  100% { transform: scale(3.2); opacity: 0; }
}
@keyframes cf-glow {
  0%   { opacity: 0; }
  40%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cf-bounce {
  0%   { transform: scale(0.2); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes cf-star {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: translateY(var(--ty)) scale(1); opacity: 0; }
}
`;