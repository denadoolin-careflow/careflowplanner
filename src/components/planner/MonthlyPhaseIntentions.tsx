import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMonthlyPhaseIntentions } from "@/hooks/useMonthlyPhaseIntentions";
import { MONTHLY_PHASES, emptyPhaseIntentions } from "@/lib/planner/monthly-phase-intentions";
import { LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { getNewMoonRemindersEnabled, setNewMoonRemindersEnabled } from "@/lib/moon-reminders";

export function MonthlyPhaseIntentions({ month }: { month: Date }) {
  const { intentions, loading, error, save, reload } = useMonthlyPhaseIntentions(month);
  const [draft, setDraft] = useState(emptyPhaseIntentions);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState(getNewMoonRemindersEnabled);
  useEffect(() => { setDraft(intentions); }, [intentions.plan, intentions.grow, intentions.care, intentions.letgo, month.getMonth(), month.getFullYear()]);
  const dirty = MONTHLY_PHASES.some(phase => draft[phase] !== intentions[phase]);
  return <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
    <h4 className="text-sm font-medium">My intentions for {month.toLocaleDateString(undefined, { month: "long" })}</h4>
    <div className="grid gap-3 sm:grid-cols-2">
      {MONTHLY_PHASES.map(phase => <label key={phase} className="space-y-1 text-xs font-medium">
        <span>{LUNAR_RHYTHM[phase].glyph} {LUNAR_RHYTHM[phase].label} intention</span>
        <Textarea aria-label={`${LUNAR_RHYTHM[phase].label} intention`} value={draft[phase]} disabled={loading || !!error || saving} onChange={event => setDraft(current => ({ ...current, [phase]: event.target.value }))} rows={2} className="resize-none text-sm" />
      </label>)}
    </div>
    {error && <p role="alert" className="text-xs text-destructive">Couldn't load intentions. <Button variant="link" size="sm" onClick={() => void reload()}>Try again</Button></p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button size="sm" disabled={loading || !!error || saving || !dirty} onClick={async () => {
        setSaving(true);
        try { await save(draft); toast.success("Monthly intentions saved"); } catch { toast.error("Couldn't save intentions. Your writing is still here—try again."); } finally { setSaving(false); }
      }}><Save className="mr-1 h-3.5 w-3.5" />{saving ? "Saving…" : "Save intentions"}</Button>
      <label className="flex items-center gap-2 text-xs">New moon reminders<Switch aria-label="New moon reminders" checked={reminders} onCheckedChange={value => { setReminders(value); setNewMoonRemindersEnabled(value); }} /></label>
    </div>
  </div>;
}