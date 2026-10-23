import { Tag } from "lucide-react";
import type { NoteProperty } from "@/lib/notes";
import { PROPERTY_ICONS, usePropertyStyles, resolveOption, resolveProp, textIconValue } from "@/lib/notes/property-styles";
import { PROPERTY_COLORS, propertyColorStyle } from "@/lib/notes/property-colors";
import "./property-colors.css";

/** Renders a stored icon key: lucide name, `glyph:…` or `emoji:…`. */
export function StyleIcon({ icon, className, fallback }: { icon?: string; className?: string; fallback?: any }) {
  const text = textIconValue(icon);
  if (text) return <span aria-hidden className={`inline-flex shrink-0 items-center justify-center leading-none ${className ?? ""}`} style={{ fontSize: "1em" }}>{text}</span>;
  const Icon = PROPERTY_ICONS[icon ?? ""] ?? fallback;
  return Icon ? <Icon aria-hidden className={className} /> : null;
}

export const OPTION_COLORS = PROPERTY_COLORS.map(([, hex]) => hex);

export function optionColor(prop: Pick<NoteProperty, "colors"> & { name?: string }, option: string, map?: Parameters<typeof resolveOption>[0]): string {
  const color = prop.name && map ? resolveOption(map, prop.name, option, prop.colors?.[option]).color : prop.colors?.[option];
  if (color) return color;
  let hash = 0;
  for (const char of option) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  // Keep existing automatic choice colors stable as the picker palette grows.
  return OPTION_COLORS[hash % 10];
}

export function OptionChip({ prop, option }: { prop: Pick<NoteProperty, "colors"> & { name?: string }; option: string }) {
  const map = usePropertyStyles();
  const icon = prop.name ? resolveOption(map, prop.name, option).icon : undefined;
  return (
    <span className="note-property-color inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px]" style={propertyColorStyle(optionColor(prop, option, map))}>
      {icon && <StyleIcon icon={icon} className="h-3 w-3 shrink-0 text-[11px]" />}
      <span className="min-w-0 break-words">{option}</span>
    </span>
  );
}

export function PropertyStyleMark({ name }: { name: string }) {
  const map = usePropertyStyles();
  const style = resolveProp(map, name);

  return (
    <span aria-hidden className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${style.color ? "note-property-color" : "text-foreground"}`} style={propertyColorStyle(style.color)}>
      <StyleIcon icon={style.icon} fallback={Tag} className="h-3 w-3 text-xs" />
    </span>
  );
}