import { ATMOSPHERES, AtmosphereId, AutoRules } from "@/lib/atmospheres";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ROWS: { key: keyof Omit<AutoRules, "enabled">; label: string; hint: string }[] = [
  { key: "morning",   label: "Morning (5–11)",     hint: "Soft, fresh start" },
  { key: "afternoon", label: "Afternoon (12–17)",  hint: "Sustained focus" },
  { key: "evening",   label: "Evening (18–21)",    hint: "Wind down" },
  { key: "night",     label: "Night (22–4)",       hint: "Quiet hours" },
  { key: "lowEnergy", label: "Low-energy mode",    hint: "When you toggle low-energy" },
  { key: "focus",     label: "Focus mode",         hint: "Deep work sessions" },
  { key: "fullMoon",  label: "Full moon nights",   hint: "Reflective evenings" },
];

function Select({ value, onChange }: { value: AtmosphereId; onChange: (v: AtmosphereId) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AtmosphereId)}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
    >
      {ATMOSPHERES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}

export function AutoSwitchConfig({ rules, onChange }: {
  rules: AutoRules;
  onChange: (patch: Partial<AutoRules>) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Auto-switch atmospheres</Label>
          <p className="text-[11px] text-muted-foreground">Match the day's energy automatically.</p>
        </div>
        <Switch checked={rules.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
      </div>
      {rules.enabled && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ROWS.map(r => (
            <div key={r.key} className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-2.5 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{r.label}</div>
                <div className="truncate text-[10px] text-muted-foreground">{r.hint}</div>
              </div>
              <Select value={rules[r.key] as AtmosphereId} onChange={(v) => onChange({ [r.key]: v } as Partial<AutoRules>)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}