import { usePantryColors, DEFAULT_PANTRY_COLORS, type PantryColors } from "@/lib/pantry-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const PRESETS = [
  { in_stock_color: "142 70% 45%", low_color: "38 92% 55%", out_color: "0 75% 60%" },
  { in_stock_color: "165 60% 50%", low_color: "30 100% 60%", out_color: "350 80% 60%" },
  { in_stock_color: "180 50% 50%", low_color: "45 90% 55%", out_color: "10 75% 55%" },
];

export function PantryColorPicker() {
  const { colors, save } = usePantryColors();
  const [draft, setDraft] = useState<PantryColors>(colors);
  useEffect(() => { setDraft(colors); }, [colors]);

  const Field = ({ label, k }: { label: string; k: keyof PantryColors }) => (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs">
        <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${draft[k]})` }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <Input value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })}
        placeholder="142 70% 45%" className="h-8 font-mono text-xs" />
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Customize the colors used for In Stock / Low / Out across grocery, ingredient popups, and pantry tracking. Use HSL values like <code className="text-foreground">142 70% 45%</code>.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Field label="In Stock" k="in_stock_color" />
        <Field label="Low" k="low_color" />
        <Field label="Out" k="out_color" />
      </div>
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Presets</div>
        <div className="flex gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setDraft(p)}
              className="flex gap-1 rounded-full border border-border/60 px-2 py-1 hover:bg-muted/40">
              <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${p.in_stock_color})` }} />
              <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${p.low_color})` }} />
              <span className="h-3 w-3 rounded-full" style={{ background: `hsl(${p.out_color})` }} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save(draft)}>Save colors</Button>
        <Button size="sm" variant="outline" onClick={() => save(DEFAULT_PANTRY_COLORS)}>Reset</Button>
      </div>
    </div>
  );
}
