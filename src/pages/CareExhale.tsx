import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wind, Sparkles, Loader2, Check, Moon, Heart } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CareLoopIndicator } from "@/components/care/CareLoopIndicator";
import { useStore } from "@/lib/store";
import { useAtmosphere } from "@/lib/atmospheres";
import { aiInvoke } from "@/lib/ai-invoke";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_ANCHORS } from "@/lib/anchors";

interface ExhaleBrief {
  summary: string;
  highlights: string[];
  release_reflection: string;
  tomorrow_kind_step: string;
  closing_blessing: string;
}

const CLOSING_CHECKLIST = [
  "Took one slow breath",
  "Named one thing that mattered today",
  "Let one unfinished thing be unfinished",
  "Said something kind to yourself",
];

export default function CareExhale() {
  const { state } = useStore();
  const { current: atmosphere } = useAtmosphere();
  const today = format(new Date(), "yyyy-MM-dd");

  const [release, setRelease] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState<ExhaleBrief | null>(null);
  const [checks, setChecks] = useState<Record<number, boolean>>({});

  const completed = useMemo(
    () => state.tasks.filter((t) => t.status === "done" && t.completedAt?.startsWith(today)),
    [state.tasks, today],
  );
  const remaining = useMemo(
    () => state.tasks.filter((t) => t.dueDate === today && t.status !== "done"),
    [state.tasks, today],
  );

  async function generate() {
    setBusy(true);
    try {
      const topAnchors = DEFAULT_ANCHORS.map((a) => ({
        key: a.key,
        label: a.label,
        flow: completed.filter((t) => t.anchorKey === a.key).length,
      })).sort((a, b) => b.flow - a.flow).slice(0, 4);

      const { data, error } = await aiInvoke<{ exhale: ExhaleBrief }>("ai-exhale", {
        body: {
          date: today,
          atmosphere,
          energy: state.energyToday ?? null,
          completedTasks: completed.slice(0, 8).map((t) => ({ title: t.title, anchorKey: t.anchorKey })),
          remainingTasks: remaining.slice(0, 6).map((t) => ({ title: t.title, anchorKey: t.anchorKey })),
          topAnchors,
          release: release.trim() || undefined,
        },
      });
      if (error && !data?.exhale) throw new Error(error?.message || "Exhale unavailable");
      setBrief((data?.exhale as ExhaleBrief) ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't reach Exhale just now.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReflection() {
    if (!brief) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in to save."); return; }
      const bodyText = [
        brief.summary,
        "",
        release.trim() ? `Releasing: ${release.trim()}` : null,
        `Reflection: ${brief.release_reflection}`,
        `Tomorrow's kind step: ${brief.tomorrow_kind_step}`,
        "",
        brief.closing_blessing,
      ].filter(Boolean).join("\n");
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        date: today,
        type: "exhale",
        template: "care_exhale",
        title: "Exhale — " + format(new Date(), "MMM d"),
        body: bodyText,
        anchor_key: "reflection",
        prompts: brief.highlights as any,
        tags: ["care", "exhale"],
      });
      if (error) throw error;
      toast.success("Saved to your reflections.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to CARE Hub">
          <Link to="/care"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CARE · Exhale</p>
          <h1 className="font-display text-2xl font-semibold leading-tight">Close the day softly</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </div>

      <CareLoopIndicator active="exhale" />

      {/* Closing checklist */}
      <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-base">
          <Wind className="h-4 w-4 text-primary" /> A gentle closing checklist
        </h2>
        <ul className="space-y-2">
          {CLOSING_CHECKLIST.map((item, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-primary-soft/20 px-3 py-2">
              <Checkbox
                id={`chk-${i}`}
                checked={!!checks[i]}
                onCheckedChange={(v) => setChecks((c) => ({ ...c, [i]: !!v }))}
                className="mt-0.5"
              />
              <label htmlFor={`chk-${i}`} className="text-sm leading-relaxed">{item}</label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] italic text-muted-foreground">
          Nothing here is required. The list is a gesture, not a goal.
        </p>
      </section>

      {/* Release note */}
      <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
        <h2 className="mb-2 flex items-center gap-2 font-display text-base">
          <Heart className="h-4 w-4 text-primary" /> What are you releasing tonight?
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          A worry, an unfinished task, a feeling. One line is plenty.
        </p>
        <Textarea
          value={release}
          onChange={(e) => setRelease(e.target.value)}
          placeholder="Tonight I'm letting go of…"
          className="min-h-20 resize-y"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={generate} disabled={busy} size="sm">
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            Exhale with AI
          </Button>
        </div>
      </section>

      {/* AI brief */}
      {brief && (
        <section className="space-y-3 rounded-2xl border border-primary/30 bg-primary-soft/20 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today held</p>
            <p className="mt-1 text-sm text-foreground/90">{brief.summary}</p>
          </div>
          {brief.highlights?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Small noticings</p>
              <ul className="mt-1 space-y-1">
                {brief.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-3.5 w-3.5 text-primary" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Releasing</p>
            <p className="mt-1 text-sm italic text-foreground/85">{brief.release_reflection}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">One kind step for tomorrow</p>
            <p className="mt-1 text-sm font-medium">{brief.tomorrow_kind_step}</p>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-card/60 p-3">
            <Moon className="mt-0.5 h-4 w-4 text-primary" />
            <p className="text-sm italic text-foreground/85">{brief.closing_blessing}</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/journal">Open reflections</Link>
            </Button>
            <Button onClick={saveReflection} disabled={saving} size="sm">
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Save to reflections
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}