import type { CSSProperties } from "react";

export const PROPERTY_COLORS = [
  ["sand", "#e6d3b3"], ["rose", "#f4c7c3"], ["peach", "#f7d9a8"], ["gold", "#fbeaa0"],
  ["sage", "#c8e6c9"], ["teal", "#b3dfe0"], ["blue", "#bcd4f6"], ["lavender", "#d9c8f2"],
  ["pink", "#f2c6de"], ["stone", "#d6d3d1"], ["burgundy", "#dfafbb"], ["olive", "#d4d9b0"],
  ["mint", "#bcebd8"], ["aqua", "#baeaf0"], ["periwinkle", "#c8ccf3"], ["lilac", "#e9c8ee"],
  ["coral", "#ffbcb0"], ["apricot", "#ffd3aa"], ["lemon", "#f6efa9"], ["fern", "#b9d7a1"],
  ["sky", "#b7e0f7"], ["plum", "#d5b4dc"], ["clay", "#ddbfb3"], ["silver", "#e0e5e8"],
] as const;

/** Preserve existing saved hex values while presenting palette colors through tokens. */
export function propertyColorStyle(color?: string): CSSProperties | undefined {
  if (!color) return undefined;
  const preset = PROPERTY_COLORS.find(([name, hex]) => name === color || hex === color.toLowerCase());
  return { "--property-selected-color": preset ? `var(--note-property-${preset[0]})` : color } as CSSProperties;
}