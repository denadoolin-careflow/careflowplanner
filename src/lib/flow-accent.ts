import { useMemo } from "react";
import { useAtmosphere, type Atmosphere } from "@/lib/atmospheres";
import { getFlowColorOverrides, useFlowColorOverrides } from "@/lib/flow-color-prefs";

/**
 * Maps each Flow pillar to a preferred swatch index in the active
 * atmosphere palette. Indices skip the typical "paper" swatch (2) so the
 * resulting tint always has enough chroma to read as an accent.
 */
export const FLOW_PALETTE_INDEX: Record<string, number> = {
  planflow:   0,
  careflow:   3,
  homeflow:   4,
  wellflow:   1,
  growthflow: 5,
  moneyflow:  3,
  lunarflow:  4,
  settings:   1,
};

export type FlowAccent = {
  /** Solid accent hex, suitable for text/icon color. */
  color: string;
  /** Translucent fill for icon badges. */
  soft: string;
  /** Translucent stroke for rings/borders. */
  ring: string;
  /** Starting color for header gradients (fades to transparent). */
  gradient: string;
};

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)))
    .toString(16)
    .padStart(2, "0");
  return `#${v}${a}`;
}

function pickSwatch(palette: string[], preferred: number): string {
  if (palette.length === 0) return "#888888";
  // Skip swatch 2 (commonly the light paper color) if a different one exists.
  let idx = preferred;
  if (idx >= palette.length) idx = idx % palette.length;
  if (palette.length > 2 && idx === 2) idx = (idx + 1) % palette.length;
  return palette[idx];
}

export function getFlowAccent(flowId: string, atmosphere: Atmosphere, overrides?: Record<string, number>): FlowAccent {
  const ov = overrides ?? getFlowColorOverrides();
  const idx = (ov[flowId] ?? FLOW_PALETTE_INDEX[flowId] ?? 0);
  const color = pickSwatch(atmosphere.palette, idx);
  return {
    color,
    soft: withAlpha(color, 0.16),
    ring: withAlpha(color, 0.42),
    gradient: withAlpha(color, 0.28),
  };
}

/** Reactive accent hook that re-renders when the atmosphere or overrides change. */
export function useFlowAccent(flowId: string): FlowAccent {
  const { atmosphere } = useAtmosphere();
  const overrides = useFlowColorOverrides();
  return useMemo(() => getFlowAccent(flowId, atmosphere, overrides), [flowId, atmosphere, overrides]);
}

/** Get all flow accents in one go (re-renders with atmosphere and overrides). */
export function useFlowAccents(): Record<string, FlowAccent> {
  const { atmosphere } = useAtmosphere();
  const overrides = useFlowColorOverrides();
  return useMemo(() => {
    const out: Record<string, FlowAccent> = {};
    const ids = new Set([...Object.keys(FLOW_PALETTE_INDEX), ...Object.keys(overrides)]);
    for (const id of ids) {
      out[id] = getFlowAccent(id, atmosphere, overrides);
    }
    return out;
  }, [atmosphere, overrides]);
}