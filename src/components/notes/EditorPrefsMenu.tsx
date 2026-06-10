import { Settings2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  THEME_OPTIONS,
  useEditorPrefs,
  type EditorDensity,
  type EditorWidth,
  type NoteTitleSize,
} from "@/lib/editor-prefs";

const DENSITIES: { id: EditorDensity; label: string }[] = [
  { id: "cozy", label: "Cozy" },
  { id: "comfortable", label: "Comfortable" },
  { id: "airy", label: "Airy" },
];

const WIDTHS: { id: EditorWidth; label: string }[] = [
  { id: "narrow", label: "Narrow" },
  { id: "regular", label: "Regular" },
  { id: "wide", label: "Wide" },
  { id: "full", label: "Full" },
];

export function EditorPrefsMenu() {
  const [prefs, set] = useEditorPrefs();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editor preferences">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 space-y-4">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Theme</div>
          <div className="grid grid-cols-4 gap-2">
            {THEME_OPTIONS.map(t => (
              <button
                key={t.id}
                onClick={() => set({ theme: t.id })}
                className={cn(
                  "group flex flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] transition",
                  prefs.theme === t.id ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-muted-foreground",
                )}
              >
                <span
                  className="h-8 w-full rounded-md border border-border/60"
                  style={{ background: t.swatch }}
                />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
          {prefs.theme === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-2">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="color"
                  value={prefs.customBg}
                  onChange={(e) => set({ customBg: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded border border-border/60 bg-transparent p-0"
                />
                Background
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="color"
                  value={prefs.customFg}
                  onChange={(e) => set({ customFg: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded border border-border/60 bg-transparent p-0"
                />
                Text
              </label>
            </div>
          )}
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Width</div>
          <div className="flex gap-1.5">
            {WIDTHS.map(w => (
              <button
                key={w.id}
                onClick={() => set({ width: w.id })}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs transition",
                  prefs.width === w.id ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-muted-foreground",
                )}
              >{w.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Density</div>
          <div className="flex gap-1.5">
            {DENSITIES.map(d => (
              <button
                key={d.id}
                onClick={() => set({ density: d.id })}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs transition",
                  prefs.density === d.id ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-muted-foreground",
                )}
              >{d.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5"><Type className="h-3 w-3" /> Font size</span>
            <span>{Math.round(prefs.fontScale * 100)}%</span>
          </div>
          <Slider
            value={[prefs.fontScale]}
            min={0.9} max={1.3} step={0.05}
            onValueChange={([v]) => set({ fontScale: v })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
