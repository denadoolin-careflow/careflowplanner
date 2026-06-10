import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

/* Astrology / planetary / zodiac icons rendered as stroke SVGs
   to match Lucide’s 24×24 viewBox, strokeWidth=2 aesthetic. */

type SvgProps = React.SVGProps<SVGSVGElement>;

function makeIcon(render: (props: SvgProps) => JSX.Element): LucideIcon {
  const Comp = forwardRef<SVGSVGElement, SvgProps>((props, ref) =>
    render({ ref, ...props }),
  );
  Comp.displayName = "AstrologyIcon";
  return Comp as unknown as LucideIcon;
}

/* ─── Planets ─── */

export const Mercury = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M12 12v6" />
    <path d="M9 18h6" />
    <path d="M12 2v2" />
  </svg>
));

export const Venus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M12 12v6" />
    <path d="M9 18h6" />
  </svg>
));

export const Mars = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="10" cy="14" r="4" />
    <path d="M19 5l-5.5 5.5" />
    <path d="M15 5h4v4" />
  </svg>
));

export const Jupiter = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 4c3 2 3 8 0 10" />
    <path d="M6 14h10" />
    <path d="M16 4v16" />
  </svg>
));

export const Saturn = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 4h8" />
    <path d="M10 4v4" />
    <path d="M14 4v4" />
    <path d="M8 8h8v4H8z" />
    <path d="M12 12v8" />
  </svg>
));

export const Uranus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 6h10" />
    <path d="M12 6v4" />
    <path d="M7 10h10" />
    <path d="M12 10v10" />
    <circle cx="12" cy="4" r="2" />
  </svg>
));

export const Neptune = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M8 20c0-4 4-4 4-8s-4-4-4-8" />
    <path d="M16 20c0-4-4-4-4-8s4-4 4-8" />
    <path d="M12 4v2" />
    <path d="M12 22v-2" />
    <path d="M10 6l2-2 2 2" />
  </svg>
));

export const Pluto = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 6h8" />
    <path d="M10 6v12" />
    <path d="M16 10c2.2 0 4 1.8 4 4s-1.8 4-4 4" />
    <path d="M16 18h-2" />
  </svg>
));

/* ─── Zodiac ─── */

export const Aries = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 18C6 12 8 6 12 6s6 6 6 12" />
    <path d="M6 18h2" />
    <path d="M16 18h2" />
  </svg>
));

export const Taurus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="14" r="5" />
    <path d="M17 11c2-2 4-1 4 1" />
    <path d="M7 11c-2-2-4-1-4 1" />
  </svg>
));

export const Gemini = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M7 4v16" />
    <path d="M17 4v16" />
    <path d="M7 8h10" />
    <path d="M7 16h10" />
  </svg>
));

export const Cancer = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="8" cy="14" r="4" />
    <circle cx="16" cy="14" r="4" />
    <path d="M12 6c-2 0-4 2-4 4" />
    <path d="M12 6c2 0 4 2 4 4" />
  </svg>
));

export const Leo = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="16" cy="8" r="4" />
    <path d="M12 10c-3 2-4 5-2 8s5 3 6 1" />
    <path d="M12 4c2-1 4-1 5 1" />
  </svg>
));

export const Virgo = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 4v12c0 3 2 5 4 5" />
    <path d="M10 4v12c0 3 2 5 4 5" />
    <path d="M14 4v12c0 3 2 5 4 5" />
    <path d="M18 4v4" />
    <path d="M18 12c0 4-2 6-4 8" />
  </svg>
));

export const Libra = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 18h16" />
    <path d="M6 14h12" />
    <path d="M8 14v-4c0-2.2 1.8-4 4-4s4 1.8 4 4v4" />
  </svg>
));

export const Scorpio = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 16c0-4 2-8 6-8s6 4 6 8v4" />
    <path d="M18 20l2 2" />
    <path d="M18 16l2-2" />
    <path d="M18 20v-4" />
  </svg>
));

export const Sagittarius = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20L20 4" />
    <path d="M10 4h10v10" />
  </svg>
));

export const Capricorn = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 18c0-4 2-8 6-8" />
    <path d="M12 10c3 0 5 2 5 5s-2 5-5 5" />
    <path d="M12 10V6" />
    <path d="M12 6c1-2 3-3 5-2" />
  </svg>
));

export const Aquarius = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 10l3-3 3 3 3-3 3 3 3-3 3 3" />
    <path d="M4 16l3-3 3 3 3-3 3 3 3-3 3 3" />
  </svg>
));

export const Pisces = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 4c-2 5-2 11 0 16" />
    <path d="M18 4c2 5 2 11 0 16" />
    <path d="M2 12h20" />
  </svg>
));
