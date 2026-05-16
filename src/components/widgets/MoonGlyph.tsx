import { getMoonAgeDays } from "@/lib/moon";
import { cn } from "@/lib/utils";

interface MoonGlyphProps {
  date?: Date;
  size?: number;
  className?: string;
}

const TINT = {
  lit: "hsl(40 35% 90%)",
  shadow: "hsl(28 25% 65% / 0.6)",
  deepShadow: "hsl(28 25% 55% / 0.78)",
  stroke: "hsl(25 25% 25% / 0.25)",
};

/**
 * Soft hand-drawn moon glyph ported from Lunar Life.
 * Renders a cream disc with a crescent shadow whose orientation/size
 * reflects the current illuminated fraction.
 */
export function MoonGlyph({ date = new Date(), size = 56, className }: MoonGlyphProps) {
  const age = getMoonAgeDays(date);
  const phase = age / 29.53058867; // 0..1
  const illum = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  const waxing = phase < 0.5;
  const r = size / 2;

  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size, background: TINT.lit, borderRadius: "9999px" }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0">
        <defs>
          <clipPath id={`moon-clip-${size}`}>
            <circle cx={r} cy={r} r={r - 1} />
          </clipPath>
        </defs>
        <g clipPath={`url(#moon-clip-${size})`}>
          <ellipse
            cx={waxing ? r - r * (1 - illum) : r + r * (1 - illum)}
            cy={r}
            rx={r * (1 - illum) + 0.5}
            ry={r}
            fill={TINT.shadow}
          />
          {illum < 0.04 && <circle cx={r} cy={r} r={r} fill={TINT.deepShadow} />}
        </g>
        <circle cx={r} cy={r} r={r - 0.75} fill="none" stroke={TINT.stroke} strokeWidth="0.75" />
      </svg>
    </div>
  );
}
