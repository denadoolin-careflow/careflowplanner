import { Tag } from "lucide-react";
import type { NoteProperty } from "@/lib/notes";
import { PROPERTY_ICONS, usePropertyStyles, resolveOption, resolveProp } from "@/lib/notes/property-styles";

export const OPTION_COLORS = ["#e6d3b3", "#f4c7c3", "#f7d9a8", "#fbeaa0", "#c8e6c9", "#b3dfe0", "#bcd4f6", "#d9c8f2", "#f2c6de", "#d6d3d1"];

export function optionColor(prop: Pick<NoteProperty, "colors"> & { name?: string }, option: string, map?: Parameters<typeof resolveOption>[0]): string {
  const color = prop.name && map ? resolveOption(map, prop.name, option, prop.colors?.[option]).color : prop.colors?.[option];
  if (color) return color;
  let hash = 0;
  for (const char of option) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return OPTION_COLORS[hash % OPTION_COLORS.length];
}

export function OptionChip({ prop, option }: { prop: Pick<NoteProperty, "colors"> & { name?: string }; option: string }) {
  const map = usePropertyStyles();
  const Icon = prop.name ? PROPERTY_ICONS[resolveOption(map, prop.name, option).icon ?? ""] : null;
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-foreground" style={{ backgroundColor: optionColor(prop, option, map) }}>
      {Icon && <Icon aria-hidden className="h-3 w-3 shrink-0" />}
      <span className="min-w-0 break-words">{option}</span>
    </span>
  );
}

export function PropertyStyleMark({ name }: { name: string }) {
  const map = usePropertyStyles();
  const style = resolveProp(map, name);
  const Icon = PROPERTY_ICONS[style.icon ?? ""] ?? Tag;
  return (
    <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground" style={style.color ? { backgroundColor: style.color } : undefined}>
      <Icon className="h-3 w-3" />
    </span>
  );
}