import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const COSMIC_TAGS = [
  { value: "seed",       label: "Seed",      glyph: "🌑" },
  { value: "build",      label: "Build",     glyph: "🌓" },
  { value: "release",    label: "Release",   glyph: "🌕" },
  { value: "clear",      label: "Clear",     glyph: "🌗" },
  { value: "review",     label: "Review",    glyph: "☿" },
  { value: "beautify",   label: "Beautify",  glyph: "♀" },
  { value: "act",        label: "Act",       glyph: "♂" },
  { value: "structure",  label: "Structure", glyph: "♄" },
  { value: "expand",     label: "Expand",    glyph: "♃" },
] as const;

export type CosmicTagValue = (typeof COSMIC_TAGS)[number]["value"];

export function CosmicTagPicker({ value, onChange }: { value?: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COSMIC_TAGS.map(t => {
        const active = value === t.value;
        return (
          <Button
            key={t.value}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("h-7 gap-1 text-xs", active && "shadow-sm")}
            onClick={() => onChange(active ? null : t.value)}
          >
            <span aria-hidden>{t.glyph}</span>
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}