/**
 * 4 key phase model: Sow / Grow / Glow / Let Go.
 * Layers on top of the 8-phase MoonPhase from src/lib/moon.ts.
 */
import type { MoonPhase } from "@/lib/moon";

export type KeyPhase = "sow" | "grow" | "glow" | "let-go";

export interface KeyPhaseInfo {
  key: KeyPhase;
  /** Short verb label shown on chips. */
  verb: string;
  /** Long display label (e.g. "Glow · Full moon"). */
  label: string;
  glyph: string;
  /** HSL token color (raw HSL triplet, ready for `hsl(var(...))`-style usage). */
  hsl: string;
  /** One-line invitation. */
  invitation: string;
  /** Plan-with-this-phase paragraph. */
  planning: string;
  /** 3 actionable hints tied to CareFlow surfaces. */
  hints: string[];
}

export const KEY_PHASES: Record<KeyPhase, KeyPhaseInfo> = {
  sow: {
    key: "sow",
    verb: "Sow",
    label: "Sow · New moon",
    glyph: "🌑",
    hsl: "248 35% 55%",
    invitation: "A soft reset. Plant one quiet intention.",
    planning:
      "New moons are for naming, not finishing. Capture seeds in the Inbox, set one keystone intention for the cycle, and resist the urge to plan the whole month.",
    hints: [
      "Set one keystone intention for the next 28 days",
      "Brain-dump fresh ideas into the Inbox",
      "Keep today's task list to 3 items",
    ],
  },
  grow: {
    key: "grow",
    verb: "Grow",
    label: "Grow · First quarter",
    glyph: "🌓",
    hsl: "150 45% 50%",
    invitation: "Friction is the path. Commit to one thing.",
    planning:
      "First-quarter energy meets resistance — perfect for focused work blocks and decisions. Choose what to keep, drop what's not real, and schedule the deep work while momentum is on your side.",
    hints: [
      "Schedule 2 focus blocks on the Week view",
      "Move 1 stale task to Not Today",
      "Make 1 decision you've been postponing",
    ],
  },
  glow: {
    key: "glow",
    verb: "Glow",
    label: "Glow · Full moon",
    glyph: "🌕",
    hsl: "42 90% 62%",
    invitation: "Everything is lit. Feel without fixing.",
    planning:
      "Full moons reveal — the wins and the tender bits both. This is the moment for celebration, review, and honest reflection. Don't start new things; honor what's already shining.",
    hints: [
      "Run a Weekly Review",
      "Log a small win in the Journal",
      "Tell someone one true, kind thing",
    ],
  },
  "let-go": {
    key: "let-go",
    verb: "Let go",
    label: "Let go · Last quarter",
    glyph: "🌗",
    hsl: "300 30% 55%",
    invitation: "Make space. Release without guilt.",
    planning:
      "Last-quarter is editing season. Archive what's done, decline what doesn't fit, and run a soft reset on your spaces and your task list. Smaller is the goal.",
    hints: [
      "Archive completed projects",
      "Decline or reschedule 1 commitment",
      "Run a 10-minute reset (inbox or room)",
    ],
  },
};

/** Map any 8-phase MoonPhase to one of the 4 key phases. */
export function toKeyPhase(phase: MoonPhase): KeyPhase {
  switch (phase) {
    case "new":
    case "waning-crescent":
      return "sow";
    case "waxing-crescent":
    case "first-quarter":
      return "grow";
    case "waxing-gibbous":
    case "full":
      return "glow";
    case "waning-gibbous":
    case "last-quarter":
      return "let-go";
  }
}

/** True for the 4 "exact" key-phase days. */
export function isKeyPhaseDay(phase: MoonPhase): boolean {
  return phase === "new" || phase === "first-quarter" || phase === "full" || phase === "last-quarter";
}

export function getKeyPhaseInfo(phase: MoonPhase): KeyPhaseInfo {
  return KEY_PHASES[toKeyPhase(phase)];
}