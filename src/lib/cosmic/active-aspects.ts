/**
 * Active aspects between transiting planets, computed for "today" with
 * exact-date projection and applying/separating direction. Returns the
 * strongest 3–5 aspects to surface in Current Transits.
 */
import { addDays, format } from "date-fns";
import {
  type Planet, type Sign,
  planetLongitude, planetSpeed, planetSign, isRetrograde,
  SIGN_GLYPH, PLANET_GLYPH,
} from "@/lib/transits";

export type AspectKind = "conjunction" | "sextile" | "square" | "trine" | "opposition";

const ASPECT_ANGLE: Record<AspectKind, number> = {
  conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180,
};
const ASPECT_GLYPH: Record<AspectKind, string> = {
  conjunction: "☌", sextile: "✶", square: "□", trine: "△", opposition: "☍",
};
/** Default orb per aspect — wider for conjunction/opposition, tighter for sextile. */
const ORB: Record<AspectKind, number> = {
  conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 5,
};

const PLANETS: Planet[] = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

export interface ActiveAspect {
  id: string;
  a: Planet; b: Planet;
  aSign: Sign; bSign: Sign;
  aGlyph: string; bGlyph: string;
  aspect: AspectKind;
  aspectGlyph: string;
  /** Signed orb in degrees (smaller = closer to exact). */
  orb: number;
  /** "applying" = orb shrinking, "separating" = orb widening. */
  motion: "applying" | "separating";
  /** Intensity 1–5 derived from tightness + planet weight. */
  intensity: number;
  /** Date the aspect is (or was) most exact, ISO yyyy-mm-dd. */
  exactDate: string;
  /** Window string for UI, e.g. "Exact: Jun 5 – Jun 8". */
  window: string;
  /** Friendly title. */
  title: string;          // "Venus Trine Jupiter"
  meaning: string;        // one short phrase
  affects: string;        // life area
  action: string;         // chip label
  retroNote?: string;
}

const TITLE_VERB: Record<AspectKind, string> = {
  conjunction: "Conjunct", sextile: "Sextile", square: "Square", trine: "Trine", opposition: "Opposition",
};

/** Per pair-and-aspect meaning copy. Falls back to a generic warm line. */
function copyFor(a: Planet, b: Planet, aspect: AspectKind): { meaning: string; affects: string; action: string } {
  const pair = [a, b].sort().join("-");
  const map: Record<string, Partial<Record<AspectKind, { meaning: string; affects: string; action: string }>>> = {
    "Jupiter-Venus": {
      trine: { meaning: "Expansion through relationships and creativity.", affects: "Partnerships, Creativity", action: "Reach out" },
      conjunction: { meaning: "A generous, lucky window for connection.", affects: "Love, Money", action: "Say yes" },
      sextile: { meaning: "Soft opportunities to grow joy and abundance.", affects: "Friendships, Joy", action: "Plan a treat" },
      square: { meaning: "Wanting more can tip into overdoing — pace pleasure.", affects: "Spending, Pleasure", action: "Pause first" },
      opposition: { meaning: "Balance personal warmth with bigger commitments.", affects: "Values, Commitments", action: "Find balance" },
    },
    "Saturn-Sun": {
      square: { meaning: "Pressure to get serious. Focus and discipline are key.", affects: "Responsibilities, Goals", action: "Stay focused" },
      conjunction: { meaning: "A reality check — build only what's real.", affects: "Identity, Authority", action: "Simplify" },
      opposition: { meaning: "Reality vs. desire — choose the next right step.", affects: "Career, Boundaries", action: "Set one limit" },
      trine: { meaning: "Steady momentum on long-term work.", affects: "Career, Mastery", action: "Pick one task" },
      sextile: { meaning: "Small disciplined steps pay off.", affects: "Habits, Plans", action: "Block 20 min" },
    },
    "Mercury-Uranus": {
      conjunction: { meaning: "Brilliant ideas and sudden insights may arise.", affects: "Communication, Ideas", action: "Capture ideas" },
      trine: { meaning: "Open-minded conversations bring breakthroughs.", affects: "Conversations, Learning", action: "Brainstorm" },
      square: { meaning: "Thoughts move fast — slow down before sending.", affects: "Messages, Decisions", action: "Reread twice" },
    },
    "Mars-Neptune": {
      sextile: { meaning: "Energy flows best when aligned with intuition.", affects: "Motivation, Creativity", action: "Trust your gut" },
      trine: { meaning: "Inspired action — dream and do.", affects: "Creative work", action: "Make something" },
      square: { meaning: "Drive feels foggy — rest is the move.", affects: "Energy, Focus", action: "Take a nap" },
    },
  };
  const hit = map[pair]?.[aspect];
  if (hit) return hit;
  // Generic fallback by aspect tone.
  const generic: Record<AspectKind, { meaning: string; affects: string; action: string }> = {
    trine:       { meaning: `${a} and ${b} flow with ease today.`,           affects: "General flow",       action: "Lean in" },
    sextile:     { meaning: `A small opening between ${a} and ${b}.`,        affects: "Opportunities",      action: "Try one thing" },
    conjunction: { meaning: `${a} meets ${b} — energies blend now.`,         affects: "Fresh starts",       action: "Notice themes" },
    square:      { meaning: `${a} and ${b} ask you to choose wisely.`,       affects: "Tensions, growth",   action: "Pause and pick" },
    opposition:  { meaning: `${a} and ${b} sit across — find the middle.`,   affects: "Balance",            action: "Listen first" },
  };
  return generic[aspect];
}

/** Weight per planet — heavier planets carry more weight. */
const PLANET_WEIGHT: Record<Planet, number> = {
  Sun: 1.2, Mercury: 0.9, Venus: 1.0, Mars: 1.0, Jupiter: 1.1, Saturn: 1.1,
};

function shortestAngle(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/** Compute active aspects for a given date. Sorted by strength desc. */
export function getActiveAspects(date: Date = new Date(), limit = 5): ActiveAspect[] {
  const out: ActiveAspect[] = [];
  const lons: Record<string, number> = {};
  const spds: Record<string, number> = {};
  for (const p of PLANETS) {
    lons[p] = planetLongitude(p, date);
    spds[p] = planetSpeed(p, date);
  }

  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const a = PLANETS[i], b = PLANETS[j];
      const sep = shortestAngle(lons[a], lons[b]);
      for (const k of Object.keys(ASPECT_ANGLE) as AspectKind[]) {
        const target = ASPECT_ANGLE[k];
        const orb = Math.abs(sep - target);
        if (orb > ORB[k]) continue;

        // Relative speed of separation/closing.
        const tomorrow = shortestAngle(
          lons[a] + spds[a], lons[b] + spds[b],
        );
        const tomorrowOrb = Math.abs(tomorrow - target);
        const motion: "applying" | "separating" = tomorrowOrb < orb ? "applying" : "separating";

        // Project days to exact along linear motion.
        const relSpeed = (spds[a] - spds[b]); // deg/day
        const daysToExact = relSpeed !== 0 ? (motion === "applying" ? -orb / Math.abs(relSpeed) : orb / Math.abs(relSpeed)) : 0;
        const exact = addDays(date, Math.round(motion === "applying" ? Math.abs(daysToExact) : -Math.abs(daysToExact)));
        const windowStart = addDays(exact, -1);
        const windowEnd = addDays(exact, 2);

        const tightness = 1 - orb / ORB[k]; // 0..1
        const weight = PLANET_WEIGHT[a] * PLANET_WEIGHT[b];
        const intensity = Math.max(1, Math.min(5, Math.round(1 + tightness * 4 * weight / 1.4)));

        const copy = copyFor(a, b, k);
        const aSign = planetSign(a, date);
        const bSign = planetSign(b, date);

        out.push({
          id: `${a}-${k}-${b}`,
          a, b, aSign, bSign,
          aGlyph: PLANET_GLYPH[a], bGlyph: PLANET_GLYPH[b],
          aspect: k,
          aspectGlyph: ASPECT_GLYPH[k],
          orb: +orb.toFixed(2),
          motion,
          intensity,
          exactDate: format(exact, "yyyy-MM-dd"),
          window: `Exact: ${format(windowStart, "MMM d")} – ${format(windowEnd, "MMM d")}`,
          title: `${a} ${TITLE_VERB[k]} ${b}`,
          meaning: copy.meaning,
          affects: copy.affects,
          action: copy.action,
          retroNote: a !== "Sun" && isRetrograde(a, date) ? `${a} retrograde` : b !== "Sun" && isRetrograde(b, date) ? `${b} retrograde` : undefined,
        });
      }
    }
  }

  out.sort((x, y) => y.intensity - x.intensity || x.orb - y.orb);
  return out.slice(0, limit);
}

/** Render an N-of-5 star intensity string. */
export function intensityStars(n: number): string {
  const filled = Math.max(0, Math.min(5, n));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export { SIGN_GLYPH };