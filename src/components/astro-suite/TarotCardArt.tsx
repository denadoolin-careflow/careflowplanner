import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TarotCard } from "@/lib/astro-suite/tarot";

import backArt from "@/assets/tarot/back.jpg";
import majorArt from "@/assets/tarot/major.jpg";
import wandsArt from "@/assets/tarot/wands.jpg";
import cupsArt from "@/assets/tarot/cups.jpg";
import swordsArt from "@/assets/tarot/swords.jpg";
import pentaclesArt from "@/assets/tarot/pentacles.jpg";

// Per-card Major Arcana artworks
import foolArt from "@/assets/tarot/majors/fool.jpg";
import magicianArt from "@/assets/tarot/majors/magician.jpg";
import highPriestessArt from "@/assets/tarot/majors/high-priestess.jpg";
import empressArt from "@/assets/tarot/majors/empress.jpg";
import emperorArt from "@/assets/tarot/majors/emperor.jpg";
import hierophantArt from "@/assets/tarot/majors/hierophant.jpg";
import loversArt from "@/assets/tarot/majors/lovers.jpg";
import chariotArt from "@/assets/tarot/majors/chariot.jpg";
import strengthArt from "@/assets/tarot/majors/strength.jpg";
import hermitArt from "@/assets/tarot/majors/hermit.jpg";
import wheelArt from "@/assets/tarot/majors/wheel.jpg";
import justiceArt from "@/assets/tarot/majors/justice.jpg";
import hangedOneArt from "@/assets/tarot/majors/hanged-one.jpg";
import deathArt from "@/assets/tarot/majors/death.jpg";
import temperanceArt from "@/assets/tarot/majors/temperance.jpg";
import devilArt from "@/assets/tarot/majors/devil.jpg";
import towerArt from "@/assets/tarot/majors/tower.jpg";
import starArt from "@/assets/tarot/majors/star.jpg";
import moonArt from "@/assets/tarot/majors/moon.jpg";
import sunArt from "@/assets/tarot/majors/sun.jpg";
import judgementArt from "@/assets/tarot/majors/judgement.jpg";
import worldArt from "@/assets/tarot/majors/world.jpg";

// Per-card Minor Arcana artworks (eagerly loaded so they bundle as URLs).
const MINOR_ART_MODULES = import.meta.glob(
  "@/assets/tarot/minors/*/*.jpg",
  { eager: true, import: "default", query: "?url" },
) as Record<string, string>;

const MINOR_ART: Record<string, string> = Object.entries(MINOR_ART_MODULES).reduce(
  (acc, [path, url]) => {
    // path looks like "/src/assets/tarot/minors/wands/1.jpg"
    const match = path.match(/minors\/([^/]+)\/(\d+)\.jpg$/);
    if (match) {
      const suit = match[1]; // wands | cups | swords | pentacles
      const rank = match[2];
      acc[`${suit}-${rank}`] = url;
    }
    return acc;
  },
  {} as Record<string, string>,
);

export const TAROT_BACK_ART = backArt;

/**
 * All tarot art URLs (back, suit fallbacks, majors, minors). Used to warm
 * the browser cache before the shuffle so the front face never appears
 * blank during rapid phase transitions (shuffle → flip → reveal).
 */
const ALL_TAROT_ART_URLS: string[] = [
  backArt,
  majorArt, wandsArt, cupsArt, swordsArt, pentaclesArt,
  foolArt, magicianArt, highPriestessArt, empressArt, emperorArt,
  hierophantArt, loversArt, chariotArt, strengthArt, hermitArt,
  wheelArt, justiceArt, hangedOneArt, deathArt, temperanceArt,
  devilArt, towerArt, starArt, moonArt, sunArt, judgementArt, worldArt,
  ...Object.values(MINOR_ART),
];

let preloadStarted = false;
let preloadPromise: Promise<void> | null = null;

/**
 * Eagerly load every tarot card image into the browser cache. Idempotent —
 * subsequent calls return the same promise. Resolves once all images have
 * either loaded or errored, so callers can safely `await` before animating.
 */
export function preloadAllTarotArt(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadStarted = true;
  preloadPromise = Promise.all(
    ALL_TAROT_ART_URLS.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
  return preloadPromise;
}

/** True once preloadAllTarotArt() has been kicked off at least once. */
export function tarotArtPreloadStarted(): boolean {
  return preloadStarted;
}

/**
 * Resolves once the given image URL is fully decoded and paintable. Uses
 * `img.decode()` when available so we know the bitmap is ready, not just
 * downloaded. Safe to call repeatedly — the browser cache dedupes work.
 */
export function preloadTarotArt(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(done, done);
      } else {
        done();
      }
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

const SUIT_ART: Record<string, string> = {
  Major: majorArt,
  Wands: wandsArt,
  Cups: cupsArt,
  Swords: swordsArt,
  Pentacles: pentaclesArt,
};

// Map Major Arcana by card id (from src/lib/tarot.ts).
const MAJOR_ART: Record<string, string> = {
  "m-0": foolArt,
  "m-1": magicianArt,
  "m-2": highPriestessArt,
  "m-3": empressArt,
  "m-4": emperorArt,
  "m-5": hierophantArt,
  "m-6": loversArt,
  "m-7": chariotArt,
  "m-8": strengthArt,
  "m-9": hermitArt,
  "m-10": wheelArt,
  "m-11": justiceArt,
  "m-12": hangedOneArt,
  "m-13": deathArt,
  "m-14": temperanceArt,
  "m-15": devilArt,
  "m-16": towerArt,
  "m-17": starArt,
  "m-18": moonArt,
  "m-19": sunArt,
  "m-20": judgementArt,
  "m-21": worldArt,
};

const ROMAN: Record<number, string> = {
  1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII",
  8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII", 13: "XIII", 14: "XIV",
  15: "XV", 16: "XVI", 17: "XVII", 18: "XVIII", 19: "XIX", 20: "XX", 21: "XXI",
  0: "0",
};

export function artForCard(card: TarotCard): string {
  if (card.arcana === "Major") {
    return MAJOR_ART[card.id] ?? SUIT_ART.Major;
  }
  // Minor Arcana: per-card art keyed by `${suit}-${rank}`, e.g. "wands-1".
  if (card.suit && typeof card.number === "number") {
    const key = `${card.suit.toLowerCase()}-${card.number}`;
    const art = MINOR_ART[key];
    if (art) return art;
  }
  return SUIT_ART[card.suit ?? "Major"] ?? SUIT_ART.Major;
}

interface TarotCardArtProps {
  card: TarotCard;
  /** Visual size variant. */
  size?: "sm" | "md" | "lg";
  /** Selected/featured ring. */
  active?: boolean;
  /** Hide the name/number overlay (used in shuffle reveal). */
  bare?: boolean;
  /** Render the card upside-down (reversed). Overlays remain readable. */
  reversed?: boolean;
  className?: string;
}

/**
 * Renders an artwork-backed tarot card with overlay name + numeral.
 * Aspect ratio is 3:5 (classic tarot proportion).
 */
export function TarotCardArt({
  card,
  size = "sm",
  active,
  bare,
  reversed,
  className,
}: TarotCardArtProps) {
  const art = artForCard(card);
  const numeral = typeof card.number === "number" ? ROMAN[card.number] ?? String(card.number) : "";

  // Track per-image readiness so we can show a graceful skeleton instead of
  // a blank/generic card while the bitmap is still decoding. Initialised
  // synchronously from a cached `Image()` probe — if the browser already
  // has the asset, we skip the skeleton entirely.
  const [loaded, setLoaded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const probe = new Image();
    probe.src = art;
    return probe.complete && probe.naturalWidth > 0;
  });

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const probe = new Image();
    probe.src = art;
    if (probe.complete && probe.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    probe.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    probe.onerror = () => {
      if (!cancelled) setLoaded(true); // fail open — show overlays anyway
    };
    return () => {
      cancelled = true;
    };
  }, [art]);

  return (
    <div
      className={cn(
        "relative aspect-[3/5] w-full overflow-hidden rounded-xl border border-border shadow-soft",
        "bg-card",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        reversed && "ring-1 ring-accent/60",
        className,
      )}
    >
      {/* Skeleton fallback — visible only while the front-face bitmap is
          still decoding. Uses the same rounded/aspect frame so there's no
          layout shift when the real art swaps in. */}
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/70 to-muted"
        />
      )}
      <img
        src={art}
        alt=""
        loading="eager"
        decoding="sync"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover select-none pointer-events-none transition-opacity duration-300",
          reversed && "rotate-180",
          loaded ? "opacity-100" : "opacity-0",
        )}
        draggable={false}
      />

      {!bare && (
        <>
          {/* Top numeral badge */}
          {numeral && (
            <div
              className={cn(
                "absolute top-1.5 left-1.5 rounded-md bg-background/85 backdrop-blur-sm",
                "px-1.5 py-0.5 font-display tabular-nums text-foreground/85 leading-none",
                size === "sm" && "text-[10px]",
                size === "md" && "text-xs",
                size === "lg" && "text-sm",
              )}
            >
              {numeral}
            </div>
          )}
          {/* Top arcana/suit badge */}
          <div
            className={cn(
              "absolute top-1.5 right-1.5 rounded-md bg-background/85 backdrop-blur-sm",
              "px-1.5 py-0.5 uppercase tracking-[0.18em] text-foreground/70 leading-none",
              size === "sm" && "text-[8px]",
              size === "md" && "text-[9px]",
              size === "lg" && "text-[10px]",
            )}
          >
            {card.arcana === "Major" ? "Major" : card.suit}
          </div>

          {/* Bottom name banner — covers any baked-in label area */}
          <div
            className={cn(
              "absolute inset-x-1 bottom-1 rounded-md bg-background/90 backdrop-blur-sm",
              "border border-border/70 px-2 text-center font-display text-foreground",
              "shadow-[0_1px_0_hsl(var(--ink-faint)/0.2)]",
              size === "sm" && "py-1 text-[11px] leading-tight",
              size === "md" && "py-1.5 text-[13px] leading-tight",
              size === "lg" && "py-2 text-[15px] leading-tight",
            )}
          >
            {card.name}
            {reversed && (
              <span
                className={cn(
                  "ml-1 align-middle uppercase tracking-[0.18em] text-accent",
                  size === "sm" && "text-[8px]",
                  size === "md" && "text-[9px]",
                  size === "lg" && "text-[10px]",
                )}
              >
                · Rev
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface TarotCardBackProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Apply a slight tilt for stack effect. */
  tilt?: number;
}

export function TarotCardBack({ size = "md", className, tilt = 0 }: TarotCardBackProps) {
  return (
    <div
      className={cn(
        "relative aspect-[3/5] w-full overflow-hidden rounded-xl border border-border shadow-paper bg-card",
        size === "sm" && "rounded-lg",
        className,
      )}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      <img
        src={backArt}
        alt=""
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
