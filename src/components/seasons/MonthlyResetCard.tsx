import { Textarea } from "@/components/ui/textarea";
import type { MonthReset } from "@/lib/monthly-plan";

const FIELDS: Array<{ key: keyof MonthReset; label: string; placeholder: string }> = [
  { key: "worked", label: "What worked", placeholder: "Anything that made the month easier" },
  { key: "heavy", label: "What felt heavy", placeholder: "No judgement, just noticing" },
  { key: "simplify", label: "What to simplify", placeholder: "One thing to make lighter" },
  { key: "carry", label: "What carries forward", placeholder: "Keep this going" },
  { key: "proud", label: "What you're proud of", placeholder: "Even the small things count" },
  { key: "next", label: "What to prepare for next month", placeholder: "One early action" },
];

/** Gentle end-of-month reset, saved with the month. */
export function MonthlyResetCard({
  value, onChange,
}: { value: MonthReset; onChange: (patch: MonthReset) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`reset-${f.key}`}>{f.label}</label>
          <Textarea
            id={`reset-${f.key}`}
            value={value[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={e => onChange({ ...value, [f.key]: e.target.value })}
            className="mt-1 min-h-[64px] resize-none rounded-lg text-sm"
          />
        </div>
      ))}
    </div>
  );
}
