// Studio palette for the Project Hub. Kept as a typed map so components stay
// theme-consistent without bloating tailwind.config.
export const STUDIO = {
  sage:   "140 25% 70%",
  sageDeep: "140 28% 38%",
  /** Text-safe sage-deep that flips for dark mode. Use for labels/headings. */
  sageDeepText: "var(--studio-sage-deep-text)",
  /** Theme-aware cream surface — light cream in light mode, dark surface in dark mode. */
  cream:  "var(--studio-cream)",
  creamDeep: "var(--studio-cream-deep)",
  plum:   "330 30% 35%",
  /** Text-safe plum that flips for dark mode. Use for labels/headings, not solid backgrounds. */
  plumText: "var(--studio-plum-text)",
  plumSoft: "330 30% 92%",
  blush:  "15 60% 88%",
  blushDeep: "15 55% 65%",
  gold:   "40 80% 65%",
  goldSoft: "40 80% 92%",
  /** Theme-aware ink — dark text on light surfaces, light text on dark surfaces. */
  ink:    "var(--studio-ink)",
} as const;

export const hsl = (token: string, alpha?: number) =>
  alpha == null ? `hsl(${token})` : `hsl(${token} / ${alpha})`;

import type { ProjectStage, ProjectHealth } from "@/lib/types";

export const STAGE_META: Record<ProjectStage, { label: string; dot: string; chipBg: string; chipFg: string }> = {
  idea:        { label: "Idea",        dot: STUDIO.gold,     chipBg: STUDIO.goldSoft,  chipFg: "40 60% 30%" },
  planning:    { label: "Planning",    dot: STUDIO.blushDeep,chipBg: STUDIO.blush,     chipFg: "15 45% 28%" },
  building:    { label: "Building",    dot: STUDIO.sageDeep, chipBg: "140 30% 88%",    chipFg: "140 35% 22%" },
  launching:   { label: "Launching",   dot: STUDIO.plum,     chipBg: STUDIO.plumSoft,  chipFg: STUDIO.plum },
  maintaining: { label: "Maintaining", dot: "215 30% 55%",   chipBg: "215 40% 92%",    chipFg: "215 35% 28%" },
};

export const HEALTH_META: Record<ProjectHealth, { label: string; bg: string; fg: string; ring: string }> = {
  active:  { label: "Active",  bg: "140 35% 90%", fg: "140 35% 25%", ring: STUDIO.sageDeep },
  waiting: { label: "Waiting", bg: STUDIO.goldSoft, fg: "40 55% 28%", ring: STUDIO.gold },
  blocked: { label: "Blocked", bg: "0 65% 92%", fg: "0 55% 35%", ring: "0 55% 55%" },
};

export const stageOf = (s?: ProjectStage): ProjectStage => s ?? "planning";
export const healthOf = (h?: ProjectHealth): ProjectHealth => h ?? "active";