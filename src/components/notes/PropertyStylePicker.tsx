import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROPERTY_ICONS, MOON_GLYPHS, PLANET_GLYPHS, ZODIAC_GLYPHS, glyphIcon, textIconValue } from "@/lib/notes/property-styles";
import { PROPERTY_COLORS, propertyColorStyle } from "@/lib/notes/property-colors";
import { EmojiPicker } from "./TextIconPicker";
import { cn } from "@/lib/utils";

const TABS = ["Icons", "Moon", "Planets", "Zodiac", "Emoji"] as const;
type Tab = typeof TABS[number];

export function IconGrid({ value, onPick }: { value?: string; onPick: (k: string | undefined) => void }) {
  const [tab, setTab] = useState<Tab>(value?.startsWith("emoji:") ? "Emoji" : value?.startsWith("glyph:") ? "Zodiac" : "Icons");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const icons = Object.entries(PROPERTY_ICONS).filter(([key]) => key.includes(q));
  const glyphs = (tab === "Moon" ? MOON_GLYPHS : tab === "Planets" ? PLANET_GLYPHS : ZODIAC_GLYPHS)
    .filter(([n]) => n.toLowerCase().includes(q));
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Icon type">
      {TABS.map(t => <Button key={t} type="button" size="sm" role="tab" aria-selected={tab === t} variant={tab === t ? "secondary" : "ghost"}
        className="h-8 px-2 text-xs" onClick={() => { setTab(t); setQuery(""); }}>{t}</Button>)}
    </div>
    {tab === "Emoji" ? <EmojiPicker value={value} onPick={onPick} /> : <>
      <Input aria-label="Search property icons" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} className="h-9 text-xs" />
      <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto p-1">
        <Button variant="ghost" size="icon" aria-label="No icon" title="No icon" onClick={() => onPick(undefined)} className={cn("h-9 w-9", !value && "ring-2 ring-primary")}>—</Button>
        {tab === "Icons"
          ? icons.map(([key, Icon]) => <Button key={key} variant="ghost" size="icon" aria-label={`Icon ${key}`} title={key} onClick={() => onPick(key)} className={cn("h-9 w-9", value === key && "ring-2 ring-primary")}><Icon className="h-4 w-4" /></Button>)
          : glyphs.map(([name, g]) => { const k = glyphIcon(g); return <Button key={name} variant="ghost" size="icon" aria-label={name} title={name} onClick={() => onPick(k)} className={cn("h-9 w-9", value === k && "ring-2 ring-primary")}><span aria-hidden className="text-lg leading-none">{textIconValue(k)}</span></Button>; })}
      </div>
      {!(tab === "Icons" ? icons.length : glyphs.length) && <p className="text-xs text-muted-foreground">No matches</p>}
    </>}
  </div>;
}

export function PropertyColorGrid({ value, onPick, allowClear = false }: { value?: string; onPick: (color: string | undefined) => void; allowClear?: boolean }) {
  return <div className="grid grid-cols-6 gap-1 p-1">
    {allowClear && <Button variant="ghost" size="icon" aria-label="No color" title="No color" onClick={() => onPick(undefined)} className="h-9 w-9">—</Button>}
    {PROPERTY_COLORS.map(([name, color]) => <Button key={name} variant="ghost" size="icon" aria-label={`Use ${name} color`} title={name} onClick={() => onPick(color)} className={cn("h-9 w-9", value?.toLowerCase() === color && "ring-2 ring-primary")}>
      <span className="note-property-swatch h-6 w-6 rounded-full border border-border" style={propertyColorStyle(color)} />
    </Button>)}
  </div>;
}
