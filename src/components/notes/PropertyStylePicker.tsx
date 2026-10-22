import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROPERTY_ICONS } from "@/lib/notes/property-styles";
import { PROPERTY_COLORS, propertyColorStyle } from "@/lib/notes/property-colors";
import { cn } from "@/lib/utils";

export function IconGrid({ value, onPick }: { value?: string; onPick: (k: string | undefined) => void }) {
  const [query, setQuery] = useState("");
  const icons = Object.entries(PROPERTY_ICONS).filter(([key]) => key.includes(query.trim().toLowerCase()));
  return <div className="space-y-2">
    <Input aria-label="Search property icons" placeholder="Search icons…" value={query} onChange={e => setQuery(e.target.value)} className="h-9 text-xs" />
    <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto p-1">
      <Button variant="ghost" size="icon" aria-label="No icon" title="No icon" onClick={() => onPick(undefined)} className={cn("h-9 w-9", !value && "ring-2 ring-primary")}>—</Button>
      {icons.map(([key, Icon]) => <Button key={key} variant="ghost" size="icon" aria-label={`Icon ${key}`} title={key} onClick={() => onPick(key)} className={cn("h-9 w-9", value === key && "ring-2 ring-primary")}><Icon className="h-4 w-4" /></Button>)}
    </div>
    {!icons.length && <p className="text-xs text-muted-foreground">No matching icons</p>}
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