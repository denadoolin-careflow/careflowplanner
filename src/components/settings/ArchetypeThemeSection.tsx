import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCcw, Wand2, Trash2, ListChecks, CheckCircle2 } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  syncQuizResult, clearQuizResult, getArchetype,
  PLANNING_STYLE_LABEL, type QuizResult,
} from "@/lib/archetype-quiz";
import { ATMOSPHERES, setAtmosphere, type AtmosphereId } from "@/lib/atmospheres";
import { applyArchetypeSetup } from "@/lib/apply-archetype-setup";
import { applyArchetypePack, getArchetypePack } from "@/lib/archetype-starter-pack";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

export function ArchetypeThemeSection() {
  const nav = useNavigate();
  const { reloadAll } = useStore();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    syncQuizResult().then((r) => {
      if (!cancelled) { setResult(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const archetype = result ? getArchetype(result.archetype) : null;
  const atmoMeta = result ? ATMOSPHERES.find((a) => a.id === result.atmosphere) : null;

  async function reapply() {
    if (!result || !archetype) return;
    setApplying(true);
    try {
      setAtmosphere(result.atmosphere as AtmosphereId);
      await applyArchetypeSetup(result.archetype);
      await reloadAll();
      toast.success("Recommendations re-applied", {
        description: "Dashboard, routines, and reminders refreshed for your archetype.",
      });
    } catch {
      toast.error("Couldn't re-apply right now.");
    } finally {
      setApplying(false);
    }
  }

  async function generatePlan() {
    if (!result) return;
    setGenerating(true);
    try {
      const r = await applyArchetypePack(result.archetype);
      await reloadAll();
      const created = r.habitsCreated + r.dailyCreated + r.weeklyCreated;
      if (created === 0) {
        toast("Your plan is already in place.", {
          description: "Every starter habit and task already exists for this archetype.",
        });
      } else {
        toast.success("Daily & weekly plan generated", {
          description: `${r.habitsCreated} habit${r.habitsCreated === 1 ? "" : "s"}, ${r.dailyCreated} daily task${r.dailyCreated === 1 ? "" : "s"}, ${r.weeklyCreated} weekly task${r.weeklyCreated === 1 ? "" : "s"} added.`,
        });
      }
    } catch {
      toast.error("Couldn't generate plan right now.");
    } finally {
      setGenerating(false);
    }
  }

  async function clearResult() {
    clearQuizResult();
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id) {
        await supabase.from("quiz_results").delete().eq("user_id", auth.user.id);
      }
    } catch { /* ignore */ }
    setResult(null);
    toast("Quiz result cleared.");
  }

  return (
    <SectionCard
      title="Archetype & theme"
      subtitle="Your caregiver archetype shapes your dashboard, routines, and atmosphere."
      accent="warm"
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading your result…</div>
      ) : !result || !archetype ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            You haven't taken the Caregiver Archetype Quiz yet. It's a gentle 5-question
            reflection that personalizes your CareFlow.
          </p>
          <Button onClick={() => nav("/quiz")} className="gap-2">
            <Sparkles className="h-4 w-4" /> Take the quiz
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div
            className="relative overflow-hidden rounded-2xl border border-border/60 p-5"
            style={{
              background: `linear-gradient(135deg, hsl(${archetype.hue[0]} / 0.22), hsl(${archetype.hue[1]} / 0.22))`,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-card/80 p-2 backdrop-blur">
                <Sparkles className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Your archetype
                </div>
                <div className="text-lg font-semibold">{archetype.title}</div>
                <div className="mt-1 text-sm italic text-muted-foreground">
                  "{archetype.quote}"
                </div>
                <p className="mt-3 text-sm leading-relaxed">{archetype.affirmation}</p>
              </div>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <dt className="text-xs text-muted-foreground">Planning style</dt>
              <dd className="mt-1 text-sm font-medium">
                {PLANNING_STYLE_LABEL[archetype.planningStyle]}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <dt className="text-xs text-muted-foreground">Atmosphere</dt>
              <dd className="mt-1 text-sm font-medium">{atmoMeta?.name ?? result.atmosphere}</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <dt className="text-xs text-muted-foreground">Taken</dt>
              <dd className="mt-1 text-sm font-medium">
                {new Date(result.takenAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button onClick={reapply} disabled={applying} className="gap-2">
              <Wand2 className="h-4 w-4" />
              {applying ? "Applying…" : "Re-apply recommendations"}
            </Button>
            <Button onClick={generatePlan} disabled={generating} variant="secondary" className="gap-2">
              <ListChecks className="h-4 w-4" />
              {generating ? "Generating…" : "Generate daily & weekly plan"}
            </Button>
            <Button variant="outline" onClick={() => nav("/quiz")} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Retake quiz
            </Button>
            <Button
              variant="ghost"
              onClick={clearResult}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Clear result
            </Button>
          </div>

          {(() => {
            const pack = getArchetypePack(result.archetype);
            if (!pack) return null;
            return (
              <div className="grid gap-3 sm:grid-cols-3">
                <PackPreview title="Habits" items={pack.habits.map(h => h.title)} />
                <PackPreview title="Daily tasks" items={pack.daily.map(t => t.title)} />
                <PackPreview title="Weekly tasks" items={pack.weekly.map(t => t.title)} />
              </div>
            );
          })()}

          <p className="text-xs text-muted-foreground">
            Re-applying sets your Home dashboard to the "Archetype" preset, seeds starter
            morning &amp; evening routines under "Me" (only if empty), and toggles moon journal
            reminders for cycle-aware archetypes. <strong>Generate</strong> adds the
            habit + task pack below to your tracker and Today list (skips duplicates).
          </p>
        </div>
      )}
    </SectionCard>
  );
}

function PackPreview({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="leading-snug">{t}</span>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs italic text-muted-foreground">None</li>
        )}
      </ul>
    </div>
  );
}