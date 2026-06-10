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
    {/* Crescent horns on top */}
    <path d="M8 4c0 3 1.8 5 4 5s4-2 4-5" />
    {/* Body circle */}
    <circle cx="12" cy="13" r="3.5" />
    {/* Cross below */}
    <path d="M12 16.5v5" />
    <path d="M9.5 19.5h5" />
  </svg>
));

export const Venus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8" r="4.5" />
    <path d="M12 12.5v9" />
    <path d="M8.5 18h7" />
  </svg>
));

export const Mars = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="10" cy="14" r="4.5" />
    <path d="M13.2 10.8L21 3" />
    <path d="M15 3h6v6" />
  </svg>
));

export const Jupiter = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Curl on upper-left forming the "2" loop */}
    <path d="M5 8c0-3 2-4 4-4s4 1 4 4-2 4-4 4h-2" />
    {/* Vertical stem */}
    <path d="M13 6v14" />
    {/* Horizontal cross / foot */}
    <path d="M9 20h8" />
  </svg>
));

export const Saturn = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Top cross */}
    <path d="M6 5h6" />
    <path d="M9 3v6" />
    {/* Long stem */}
    <path d="M9 5v11" />
    {/* Sickle / hook at bottom */}
    <path d="M9 16c0 3 2 5 5 5s5-2 5-5-2-5-5-5" />
  </svg>
));

export const Uranus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* H-frame: two outer verticals with crossbar */}
    <path d="M5 4v9" />
    <path d="M19 4v9" />
    <path d="M5 13h14" />
    {/* Center vertical down to circle */}
    <path d="M12 4v14" />
    {/* Circle at bottom */}
    <circle cx="12" cy="20" r="2" />
  </svg>
));

export const Neptune = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Trident curve */}
    <path d="M4 6c0 5 3.6 9 8 9s8-4 8-9" />
    {/* Three prongs */}
    <path d="M4 3v6" />
    <path d="M20 3v6" />
    <path d="M12 3v15" />
    {/* Cross on stem */}
    <path d="M9 18h6" />
    <path d="M12 15v6" />
  </svg>
));

export const Pluto = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Crescent on top */}
    <path d="M6 8c0-3 2.7-5 6-5s6 2 6 5" />
    {/* Inner circle */}
    <circle cx="12" cy="9" r="2" />
    {/* Stem */}
    <path d="M12 11v10" />
    {/* Cross */}
    <path d="M9 17h6" />
  </svg>
));

/* ─── Zodiac ─── */

export const Aries = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Ram horns curling outward from a center stem */}
    <path d="M12 10v11" />
    <path d="M12 10c-1-3-3-4-5-4S3 7 3 10s2 4 4 4" />
    <path d="M12 10c1-3 3-4 5-4s4 1 4 4-2 4-4 4" />
  </svg>
));

export const Taurus = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Bull head circle */}
    <circle cx="12" cy="16" r="5" />
    {/* Upward crescent horns */}
    <path d="M5 5c0 4 3 6 7 6s7-2 7-6" />
  </svg>
));

export const Gemini = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Twin pillars */}
    <path d="M8 5v14" />
    <path d="M16 5v14" />
    {/* Arched top and bottom */}
    <path d="M5 5c1.5-1.5 4.5-1.5 6 0" />
    <path d="M13 5c1.5-1.5 4.5-1.5 6 0" />
    <path d="M5 19c1.5 1.5 4.5 1.5 6 0" />
    <path d="M13 19c1.5 1.5 4.5 1.5 6 0" />
  </svg>
));

export const Cancer = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* 69 motif */}
    <path d="M4 9c4-3 11-3 14 1" />
    <circle cx="16" cy="11" r="2.2" fill="currentColor" />
    <path d="M20 15c-4 3-11 3-14-1" />
    <circle cx="8" cy="13" r="2.2" fill="currentColor" />
  </svg>
));

export const Leo = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Mane circle */}
    <circle cx="8" cy="9" r="4" />
    {/* Long curling tail */}
    <path d="M12 9c2 3 4 5 5 8s-1 4-3 4-3-1-3-3 1-3 3-3 4 1 5 3" />
  </svg>
));

export const Virgo = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Three humps of M, third with looped tail */}
    <path d="M4 20V8c0-1.5 1-2.5 2.5-2.5S9 6.5 9 8v12" />
    <path d="M9 20V8c0-1.5 1-2.5 2.5-2.5S14 6.5 14 8v12" />
    <path d="M14 20V8c0-1.5 1-2.5 2.5-2.5S19 6.5 19 8v9c0 2-1 4-3 4s-3-1.5-3-3 1.5-3 3-3 4 1.5 5 3.5" />
  </svg>
));

export const Libra = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Base line */}
    <path d="M3 19h18" />
    {/* Upper line with sun-on-horizon arch */}
    <path d="M3 13h6" />
    <path d="M15 13h6" />
    <path d="M9 13c0-3 1.5-5 3-5s3 2 3 5" />
  </svg>
));

export const Scorpio = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* M with stinger tail */}
    <path d="M3 18V9c0-1.5 1-2.5 2.5-2.5S8 7.5 8 9v9" />
    <path d="M8 18V9c0-1.5 1-2.5 2.5-2.5S13 7.5 13 9v9" />
    <path d="M13 18V9c0-1.5 1-2.5 2.5-2.5S18 7.5 18 9v11" />
    {/* Arrow tail pointing up-right */}
    <path d="M18 20l4-4" />
    <path d="M19 16h3v3" />
  </svg>
));

export const Sagittarius = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Arrow shaft */}
    <path d="M3 21L20 4" />
    {/* Arrowhead */}
    <path d="M13 4h7v7" />
    {/* Crossbar */}
    <path d="M8 12l5 5" />
  </svg>
));

export const Capricorn = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Goat zigzag V */}
    <path d="M3 5l4 11" />
    <path d="M7 16l4-9" />
    <path d="M11 7l4 9" />
    {/* Fish-tail loop */}
    <path d="M15 16c2 0 4 1 4 3s-2 3-4 3-3-1-3-2.5S13 17 15 17s3 1 4 2.5" />
  </svg>
));

export const Aquarius = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Two parallel water waves */}
    <path d="M3 9q2-3 4.5 0t4.5 0 4.5 0 4.5 0" />
    <path d="M3 15q2-3 4.5 0t4.5 0 4.5 0 4.5 0" />
  </svg>
));

export const Pisces = makeIcon(({ ref, ...p }) => (
  <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* Two opposing arcs */}
    <path d="M6 3c-3 4-3 14 0 18" />
    <path d="M18 3c3 4 3 14 0 18" />
    {/* Connecting cord */}
    <path d="M3 12h18" />
  </svg>
));
