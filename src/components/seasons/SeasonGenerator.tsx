import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wand2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCelebrations } from "@/lib/seasons/hooks";
import { SEASON_META, seasonFor } from "@/lib/seasons/season-utils";
import { addDays, parseISO } from "date-fns";
import type { BucketSeason } from "@/lib/seasons/types";

type Idea = {
  title: string;
  kind?: "family_milestone" | "special_event" | "anniversary" | "custom";
  icon?: string;
  date_hint?: string;
  why?: string;
  checklist?: string[];
};

const ATMOSPHERES = ["cozy", "playful", "intentional", "adventurous", "restful", "festive", "minimal"];

export function SeasonGenerator() {
  const { state } = useStore();
  const { celebrations, add: addCeleb } = useCelebrations();
  const today = new Date();
  const currentSeason = seasonFor(today);

  const [season, setSeason] = useState<BucketSeason>(currentSeason);
  const [atmosphere, setAtmosphere] = useState<string>("cozy");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const familyAges = useMemo(() => {
    const ty = today.getFullYear();
    return state.birthdays.map(b => {
      const y = Number(b.date.slice(0, 4));
      return Math.max(0, ty - y);
    }).filter(n => Number.isFinite(n));
  }, [state.birthdays, today]);

  const priorCelebrations = useMemo(
    () => celebrations.slice(0, 12).map(c => c.title),
    [celebrations],
  );

  const busyDays = useMemo(() => {
    const horizon = addDays(today, 30).toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);
    const dates = new Set<string>();
    for (const a of state.appointments) if (a.date >= todayIso && a.date <= horizon) dates.add(a.date);
    for (const t of state.tasks) if (t.dueDate && t.dueDate >= todayIso && t.dueDate <= horizon && !t.done) dates.add(t.dueDate);
    return dates.size;
  }, [state.appointments, state.tasks, today]);

  const generate = async () => {
    setLoading(true);
    setIdeas([]);
    setAdded(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("ai-seasons-assistant", {
        body: {
          season,
          year: today.getFullYear(),
          atmosphere,
          family_ages: familyAges,
          prior_celebrations: priorCelebrations,
          busy_days: busyDays,
          notes: notes.trim(),
        },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") { toast.error("AI is rate limited — try again in a moment."); return; }
      if (data?.error === "ai_quota_exceeded") { toast.error("AI credits exhausted. Add credits in Settings → Usage."); return; }
      const list = Array.isArray(data?.celebrations) ? data.celebrations as Idea[] : [];
      if (list.length === 0) { toast("No suggestions returned. Try different inputs."); return; }
      setIdeas(list);
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const addIdea = async (idx: number) => {
    const idea = ideas[idx]; if (!idea) return;
    // Best-effort date: 3 weeks out from today as a placeholder anchor.
    const target = addDays(today, 21).toISOString().slice(0, 10);
    await addCeleb({
      title: idea.title,
      date: target,
      kind: (idea.kind ?? "special_event") as any,
      icon: idea.icon ?? "🎉",
      notes: [idea.date_hint ? `When: ${idea.date_hint}` : "", idea.why ?? "", (idea.checklist ?? []).map(c => `• ${c}`).join("\n")].filter(Boolean).join("\n\n"),
    });
    setAdded(prev => new Set(prev).add(idx));
    toast.success(`Added “${idea.title}” to celebrations`);
  };

  return (
    <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2"><Wand2 className="h-4 w-4 text-primary" /></div>
        <div className="flex-1">
          <h3 className="font-display text-lg">Generate for this season</h3>
          <p className="text-xs text-muted-foreground">Get celebration ideas tuned to your family ages, prior traditions, atmosphere, and how busy your calendar already is.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <Label className="text-xs">Season</Label>
          <Select value={season} onValueChange={(v) => setSeason(v as BucketSeason)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(SEASON_META) as BucketSeason[]).map(s => (
                <SelectItem key={s} value={s}>{SEASON_META[s].emoji} {SEASON_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Atmosphere</Label>
          <Select value={atmosphere} onValueChange={setAtmosphere}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ATMOSPHERES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Calendar load (next 30 days)</Label>
          <Input value={`${busyDays} busy day${busyDays === 1 ? "" : "s"}`} readOnly className="bg-muted/40" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {familyAges.length > 0 && <Badge variant="secondary">Ages: {familyAges.sort((a,b) => a-b).join(", ")}</Badge>}
        {priorCelebrations.length > 0 && <Badge variant="secondary">Will skip {priorCelebrations.length} prior celebration{priorCelebrations.length === 1 ? "" : "s"}</Badge>}
      </div>

      <div className="mt-3">
        <Label className="text-xs">Anything to keep in mind? (optional)</Label>
        <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. grandma visiting in July, toddler napping schedule…" />
      </div>

      <div className="mt-3 flex justify-end">
        <Button onClick={generate} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Dreaming up ideas…" : "Generate ideas"}
        </Button>
      </div>

      {ideas.length > 0 && (
        <div className="mt-5 space-y-2">
          {ideas.map((idea, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span>{idea.icon ?? "🎉"}</span><span>{idea.title}</span>
                    {idea.date_hint && <Badge variant="outline" className="text-[10px] font-normal">{idea.date_hint}</Badge>}
                  </div>
                  {idea.why && <p className="mt-1 text-xs text-muted-foreground">{idea.why}</p>}
                  {idea.checklist && idea.checklist.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs">
                      {idea.checklist.map((c, j) => <li key={j} className="text-foreground/80">• {c}</li>)}
                    </ul>
                  )}
                </div>
                <Button size="sm" variant={added.has(i) ? "secondary" : "outline"} disabled={added.has(i)} onClick={() => addIdea(i)} className="gap-1 shrink-0">
                  <Plus className="h-3 w-3" /> {added.has(i) ? "Added" : "Add"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}