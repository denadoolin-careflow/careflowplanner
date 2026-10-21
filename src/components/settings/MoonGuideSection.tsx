import { SectionCard } from "@/components/cards/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setMoonGuidePrefs } from "@/lib/cosmic/moon-aspects";
import { useMoonGuidePrefs } from "@/components/cosmic/MoonAspectGuide";

export function MoonGuideSection() {
  const p = useMoonGuidePrefs();
  const row = (id: keyof typeof p, label: string, hint: string) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div><Label htmlFor={`mg-${id}`}>{label}</Label><p className="text-xs text-muted-foreground">{hint}</p></div>
      <Switch id={`mg-${id}`} checked={p[id]} onCheckedChange={v => setMoonGuidePrefs({ [id]: v })} />
    </div>
  );
  return (
    <SectionCard title="Moon aspect guide">
      {row("dayRhythm", "Show in Day rhythm", "Option A — a card in the Planner's day context.")}
      {row("timeline", "Show with the day timeline", "Option B — the checklist above your schedule.")}
      {row("autoDailyNote", "Add to new daily notes", "New daily notes start with today's Moon aspects checklist.")}
    </SectionCard>
  );
}
