import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOAL_PHASES, GOAL_SEASONS, PHASE_GUIDANCE, type GoalDetails } from "@/lib/goals/cycle";
import { RHYTHM_LABEL } from "@/lib/planner/rhythm-phase";

export const PHASE_STYLE = {
  plan: "bg-[hsl(var(--rhythm-plan-tint))] text-[hsl(var(--rhythm-plan-deep))] dark:bg-secondary dark:text-secondary-foreground",
  grow: "bg-[hsl(var(--rhythm-grow-tint))] text-[hsl(var(--rhythm-grow-deep))] dark:bg-secondary dark:text-secondary-foreground",
  care: "bg-[hsl(var(--rhythm-care-tint))] text-[hsl(var(--rhythm-care-deep))] dark:bg-secondary dark:text-secondary-foreground",
  letgo: "bg-[hsl(var(--rhythm-letgo-tint))] text-[hsl(var(--rhythm-letgo-deep))] dark:bg-secondary dark:text-secondary-foreground",
};
export const PHASE_GLYPH = { plan: "🌑", grow: "🌓", care: "🌕", letgo: "🌗" };

export function GoalCycleControls({ details, onChange }: { details: GoalDetails; onChange: (patch: Partial<GoalDetails>) => void }) {
  return <div className="space-y-3 border-y border-border py-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label>Season</Label><Select value={details.season ?? "none"} onValueChange={v => onChange({ season: v === "none" ? null : v as GoalDetails["season"] })}><SelectTrigger aria-label="Goal season"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Any season</SelectItem>{GOAL_SEASONS.map(s => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor="goal-season-year">Year</Label><Input id="goal-season-year" type="number" value={details.seasonYear ?? ""} onChange={e => onChange({ seasonYear: e.target.value ? Number(e.target.value) : null })} /></div>
      <div className="space-y-1"><Label>Rhythm phase</Label><Select value={details.phase ?? "plan"} onValueChange={v => onChange({ phase: v as GoalDetails["phase"] })}><SelectTrigger aria-label="Goal rhythm phase"><SelectValue /></SelectTrigger><SelectContent>{GOAL_PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_GLYPH[p]} {RHYTHM_LABEL[p]}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label htmlFor="goal-review-date">Review date</Label><Input id="goal-review-date" type="date" value={details.reviewDate ?? ""} onChange={e => onChange({ reviewDate: e.target.value })} /></div>
    </div>
    <p className="text-sm text-muted-foreground">{PHASE_GUIDANCE[details.phase ?? "plan"]}</p>
  </div>;
}