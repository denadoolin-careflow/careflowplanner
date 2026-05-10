import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { THEME_PRESETS, useThemePreset } from "@/lib/theme-preset";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const [preset, setPreset] = useThemePreset();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Choose color palette" className="rounded-full">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Color palette</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-colors hover:bg-muted/40",
                preset === p.id ? "border-primary bg-muted/30" : "border-border"
              )}
            >
              <span
                className="h-6 w-6 rounded-full ring-2 ring-background"
                style={{ background: p.swatch }}
              />
              <span className="capitalize">{p.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Adapts to light & dark mode automatically.
        </p>
      </PopoverContent>
    </Popover>
  );
}