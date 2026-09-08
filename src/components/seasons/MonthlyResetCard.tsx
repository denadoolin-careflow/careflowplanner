import { useEffect, useRef, useState } from "react";
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

/** Gentle end-of-month reset, saved with the month (debounced while typing). */
export function MonthlyResetCard({
  value, onChange,
}: { value: MonthReset; onChange: (patch: MonthReset) => void }) {
  const [local, setLocal] = useState<MonthReset>(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { if (!dirty.current) setLocal(value); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (next: MonthReset, immediate = false) => {
    dirty.current = true;
    clearTimeout(timer.current);
    const send = () => { dirty.current = false; onChange(next); };
    if (immediate) send();
    else timer.current = setTimeout(send, 800);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`reset-${f.key}`}>{f.label}</label>
          <Textarea
            id={`reset-${f.key}`}
            value={local[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={e => { const next = { ...local, [f.key]: e.target.value }; setLocal(next); commit(next); }}
            onBlur={() => commit(local, true)}
            className="mt-1 min-h-[72px] resize-none rounded-xl text-sm"
          />
        </div>
      ))}
    </div>
  );
}
