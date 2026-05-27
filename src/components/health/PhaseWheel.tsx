import { type CyclePhase, PHASE_META, type PhaseInfo } from "@/lib/cycle";

const PHASES: CyclePhase[] = ["menstrual", "follicular", "ovulatory", "luteal"];

interface PhaseWheelProps {
  info: PhaseInfo | null;
  size?: number;
}

/**
 * Soft circular phase wheel — four arcs, each a phase.
 * Active arc glows, others sit quietly. The center shows the day + glyph.
 */
export function PhaseWheel({ info, size = 220 }: PhaseWheelProps) {
  const r = size / 2;
  const stroke = 18;
  const radius = r - stroke / 2 - 4;
  const circ = 2 * Math.PI * radius;
  const seg = circ / 4;

  const activeIdx = info ? PHASES.indexOf(info.phase) : -1;
  const cycleLength = info?.cycleLength ?? 28;
  const progressAngle = info
    ? ((info.cycleDay - 1) / cycleLength) * 360
    : 0;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="-rotate-90"
      >
        {PHASES.map((p, i) => {
          const meta = PHASE_META[p];
          const isActive = i === activeIdx;
          return (
            <circle
              key={p}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={`hsl(var(${meta.tokenVar}))`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${seg - 6} ${circ - seg + 6}`}
              strokeDashoffset={-i * seg}
              opacity={isActive ? 0.95 : 0.22}
              style={{
                filter: isActive
                  ? `drop-shadow(0 0 12px hsl(var(${meta.tokenVar}) / 0.55))`
                  : undefined,
                transition: "opacity 600ms ease",
              }}
            />
          );
        })}

        {/* day marker dot */}
        {info && (
          <circle
            cx={r + radius * Math.cos((progressAngle * Math.PI) / 180)}
            cy={r + radius * Math.sin((progressAngle * Math.PI) / 180)}
            r={5}
            fill="hsl(var(--background))"
            stroke={`hsl(var(${info.tokenVar}))`}
            strokeWidth={2.5}
          />
        )}
      </svg>

      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl leading-none" aria-hidden>
            {info?.glyph ?? "🌸"}
          </div>
          {info ? (
            <>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Day {info.cycleDay} of {info.cycleLength}
              </p>
              <p
                className="font-display text-lg leading-tight"
                style={{ color: `hsl(var(${info.tokenVar}))` }}
              >
                {info.label}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}