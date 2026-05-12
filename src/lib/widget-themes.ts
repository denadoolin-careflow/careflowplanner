import type { CSSProperties } from "react";

/**
 * Widget appearance system.
 * Themes are pure presentation — stored in the dashboard_layouts JSONB
 * (per-page default + per-widget override). Tokens use HSL via index.css.
 */

export type ThemePreset =
  | "default"
  | "dark-plum"
  | "moonlight-lavender"
  | "midnight-gold"
  | "sage-mist"
  | "rose-dusk"
  | "warm-cream"
  | "ocean-night"
  | "glass"
  | "soft-blur";

export interface WidgetTheme {
  preset: ThemePreset;
  /** 0..1 — overall surface opacity */
  opacity?: number;
  /** 0..40 px — outer glow strength */
  glow?: number;
  /** 0..28 px — corner radius */
  radius?: number;
  /** 0..24 px — backdrop blur */
  blur?: number;
  /** Toggle gradient animation */
  animated?: boolean;
}

export const DEFAULT_THEME: WidgetTheme = {
  preset: "default",
  opacity: 1,
  glow: 0,
  radius: 18,
  blur: 0,
  animated: false,
};

interface PresetVisual {
  label: string;
  /** CSS background value (gradient or solid) */
  background: string;
  /** Foreground color (hsl token or value) */
  foreground: string;
  /** Border color */
  border: string;
  /** Glow color (hsl with /alpha) */
  glowColor: string;
  /** Default backdrop-filter blur intensity */
  glassy?: boolean;
}

export const THEME_PRESETS: Record<ThemePreset, PresetVisual> = {
  default: {
    label: "Default card",
    background: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
    border: "hsl(var(--border) / 0.6)",
    glowColor: "hsl(var(--primary) / 0.45)",
  },
  "dark-plum": {
    label: "Dark Plum",
    background: "linear-gradient(140deg, hsl(280 35% 14%), hsl(265 38% 22%))",
    foreground: "hsl(36 30% 95%)",
    border: "hsl(280 25% 35% / 0.6)",
    glowColor: "hsl(285 60% 55% / 0.55)",
  },
  "moonlight-lavender": {
    label: "Moonlight Lavender",
    background: "linear-gradient(140deg, hsl(258 45% 22%), hsl(240 50% 32%))",
    foreground: "hsl(255 80% 96%)",
    border: "hsl(258 45% 50% / 0.5)",
    glowColor: "hsl(258 70% 70% / 0.55)",
  },
  "midnight-gold": {
    label: "Midnight Gold",
    background: "linear-gradient(140deg, hsl(225 35% 12%), hsl(40 35% 22%))",
    foreground: "hsl(40 80% 92%)",
    border: "hsl(40 60% 50% / 0.45)",
    glowColor: "hsl(40 80% 60% / 0.55)",
  },
  "sage-mist": {
    label: "Sage Mist",
    background: "linear-gradient(140deg, hsl(150 30% 88%), hsl(170 30% 78%))",
    foreground: "hsl(160 35% 18%)",
    border: "hsl(150 35% 60% / 0.5)",
    glowColor: "hsl(155 50% 60% / 0.45)",
  },
  "rose-dusk": {
    label: "Rose Dusk",
    background: "linear-gradient(140deg, hsl(345 50% 88%), hsl(20 60% 86%))",
    foreground: "hsl(345 50% 22%)",
    border: "hsl(345 60% 70% / 0.5)",
    glowColor: "hsl(345 75% 70% / 0.5)",
  },
  "warm-cream": {
    label: "Warm Cream",
    background: "linear-gradient(140deg, hsl(36 60% 96%), hsl(30 55% 88%))",
    foreground: "hsl(30 35% 22%)",
    border: "hsl(30 35% 70% / 0.5)",
    glowColor: "hsl(36 75% 65% / 0.4)",
  },
  "ocean-night": {
    label: "Ocean Night",
    background: "linear-gradient(140deg, hsl(210 55% 12%), hsl(190 55% 22%))",
    foreground: "hsl(190 80% 94%)",
    border: "hsl(195 60% 45% / 0.45)",
    glowColor: "hsl(195 80% 60% / 0.55)",
  },
  glass: {
    label: "Glass",
    background: "hsl(var(--card) / 0.55)",
    foreground: "hsl(var(--card-foreground))",
    border: "hsl(var(--border) / 0.5)",
    glowColor: "hsl(var(--primary) / 0.35)",
    glassy: true,
  },
  "soft-blur": {
    label: "Soft Blur",
    background: "hsl(var(--primary-soft) / 0.55)",
    foreground: "hsl(var(--card-foreground))",
    border: "hsl(var(--primary) / 0.25)",
    glowColor: "hsl(var(--primary) / 0.5)",
    glassy: true,
  },
};

export const THEME_LIST: ThemePreset[] = [
  "default", "dark-plum", "moonlight-lavender", "midnight-gold",
  "sage-mist", "rose-dusk", "warm-cream", "ocean-night",
  "glass", "soft-blur",
];

/**
 * Resolve effective theme — page default merged with widget override.
 */
export function resolveTheme(page?: WidgetTheme | null, widget?: WidgetTheme | null): WidgetTheme {
  return {
    ...DEFAULT_THEME,
    ...(page ?? {}),
    ...(widget ?? {}),
  };
}

/**
 * Compute the inline style for a widget surface.
 */
export function themeStyle(theme: WidgetTheme): CSSProperties {
  const visual = THEME_PRESETS[theme.preset] ?? THEME_PRESETS.default;
  const blur = theme.blur ?? (visual.glassy ? 14 : 0);
  const glow = theme.glow ?? 0;
  const radius = theme.radius ?? 18;
  const opacity = theme.opacity ?? 1;

  const style: CSSProperties = {
    background: visual.background,
    color: visual.foreground,
    borderColor: visual.border,
    borderRadius: radius,
    backdropFilter: blur ? `blur(${blur}px) saturate(140%)` : undefined,
    WebkitBackdropFilter: blur ? `blur(${blur}px) saturate(140%)` : undefined,
    opacity,
  };

  if (glow > 0) {
    style.boxShadow = `0 0 ${glow}px ${visual.glowColor}, 0 8px 30px -12px hsl(0 0% 0% / 0.35)`;
  }

  // Animated gradient background — only when preset uses gradient.
  if (theme.animated && visual.background.startsWith("linear-gradient")) {
    style.backgroundSize = "200% 200%";
    style.animation = "gradient-pan 14s ease-in-out infinite";
  }

  return style;
}

/**
 * Token-friendly muted text color (works on both light + dark presets).
 */
export function themeMutedColor(theme: WidgetTheme): string {
  const visual = THEME_PRESETS[theme.preset] ?? THEME_PRESETS.default;
  // Use the foreground color but with reduced opacity. Works for hsl strings.
  return visual.foreground.replace(/\)$/, " / 0.7)").replace("hsl(", "hsl(");
}
