import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_FIELDS, COLOR_PRESETS, resolveColors, type LandingColors } from "@/lib/landing-colors";

export function LandingColorEditor({ value, onChange }: { value: LandingColors; onChange: (c: LandingColors) => void }) {
  const resolved = resolveColors(value);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Presets</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLOR_PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => onChange({ preset: p.id, custom: {} })}
              className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-2 text-left text-sm", value.preset === p.id ? "border-primary ring-2 ring-primary/30" : "border-border/60")}>
              <span className="flex shrink-0 -space-x-1">
                {(p.id === "brand" ? ["hsl(var(--background))", "hsl(var(--primary))", "hsl(var(--accent))"] : [p.colors.background, p.colors.primary, p.colors.accent]).map((c, i) => (
                  <span key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
                ))}
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Custom colors</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLOR_FIELDS.map((f) => {
            const hex = resolved[f.key];
            const custom = value.custom[f.key];
            return (
              <label key={f.key} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border/60 px-3 text-sm">
                <span>{f.label}</span>
                <span className="flex items-center gap-1">
                  {custom && (
                    <button type="button" aria-label={`Reset ${f.label}`} onClick={(e) => { e.preventDefault(); const { [f.key]: _, ...rest } = value.custom; onChange({ ...value, custom: rest }); }}
                      className="p-1 text-primary"><RotateCcw className="h-3.5 w-3.5" /></button>
                  )}
                  <input type="color" aria-label={f.label} value={hex ?? "#ffffff"}
                    onChange={(e) => onChange({ ...value, custom: { ...value.custom, [f.key]: e.target.value } })}
                    className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent" />
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
