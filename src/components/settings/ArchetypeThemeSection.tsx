import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RotateCcw, Wand2, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  syncQuizResult, clearQuizResult, getArchetype,
  PLANNING_STYLE_LABEL, type QuizResult,
} from "@/lib/archetype-quiz";
import { ATMOSPHERES, setAtmosphere, type AtmosphereId } from "@/lib/atmospheres";
import { applyArchetypeSetup } from "@/lib/apply-archetype-setup";
import { supabase } from "@/integrations/supabase/client";

export function ArchetypeThemeSection() {
  const nav = useNavigate();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

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
      toast.success("Recommendations re-applied", {
        description: "Dashboard, routines, and reminders refreshed for your archetype.",
      });
    } catch {
      toast.error("Couldn't re-apply right now.");
    } finally {
      setApplying(false);
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

          <p className="text-xs text-muted-foreground">
            Re-applying sets your Home dashboard to the "Archetype" preset, seeds starter
            morning &amp; evening routines under "Me" (only if empty), and toggles moon journal
            reminders for cycle-aware archetypes.
          </p>
        </div>
      )}
    </SectionCard>
  );
}