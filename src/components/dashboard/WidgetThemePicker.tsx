import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Palette, RotateCcw } from "lucide-react";
import {
  THEME_LIST, THEME_PRESETS, type WidgetTheme, DEFAULT_THEME, themeStyle,
} from "@/lib/widget-themes";
import { cn } from "@/lib/utils";

interface Props {
  value: WidgetTheme | null | undefined;
  onChange: (next: WidgetTheme | null) => void;
  trigger?: React.ReactNode;
  /** When true, shows a "Use page default" option that clears overrides. */
  allowClear?: boolean;
}

export function WidgetThemePicker({ value, onChange, trigger, allowClear }: Props) {
  const [open, setOpen] = useState(false);
  const t: WidgetTheme = { ...DEFAULT_THEME, ...(value ?? {}) };

  const update = (patch: Partial<WidgetTheme>) => onChange({ ...t, ...patch });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label="Theme"
            className="rounded-full bg-background/80 p-1 text-muted-foreground shadow hover:bg-background"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-4 p-4"
        onPointerDownOutside={(e) => e.stopPropagation()}
      >
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preset
            </Label>
            {allowClear && (
              <button
                onClick={() => onChange(null)}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Use page default
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {THEME_LIST.map((preset) => {
              const visual = THEME_PRESETS[preset];
              const sel = t.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  title={visual.label}
                  onClick={() => update({ preset })}
                  className={cn(
                    "h-10 w-full rounded-lg border transition-all",
                    sel ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : "border-border/60 hover:scale-[1.04]",
                  )}
                  style={themeStyle({ ...t, preset, glow: 0, blur: visual.glassy ? 8 : 0 })}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Row label={`Opacity ${Math.round((t.opacity ?? 1) * 100)}%`}>
            <Slider
              value={[Math.round((t.opacity ?? 1) * 100)]}
              min={40} max={100} step={5}
              onValueChange={(v) => update({ opacity: v[0] / 100 })}
            />
          </Row>
          <Row label={`Glow ${t.glow ?? 0}px`}>
            <Slider
              value={[t.glow ?? 0]} min={0} max={40} step={2}
              onValueChange={(v) => update({ glow: v[0] })}
            />
          </Row>
          <Row label={`Radius ${t.radius ?? 18}px`}>
            <Slider
              value={[t.radius ?? 18]} min={4} max={28} step={1}
              onValueChange={(v) => update({ radius: v[0] })}
            />
          </Row>
          <Row label={`Blur ${t.blur ?? 0}px`}>
            <Slider
              value={[t.blur ?? 0]} min={0} max={24} step={1}
              onValueChange={(v) => update({ blur: v[0] })}
            />
          </Row>
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <Label htmlFor="anim" className="text-xs">Animated gradient</Label>
            <Switch id="anim" checked={!!t.animated} onCheckedChange={(c) => update({ animated: c })} />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => onChange({ ...DEFAULT_THEME })}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}