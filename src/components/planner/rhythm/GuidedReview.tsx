import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, startOfWeek } from "date-fns";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhaseIcon } from "@/lib/phase-icons";
import { useStore } from "@/lib/store";
import { FocusGoalCard } from "@/components/goals/FocusGoalCard";
import { toast } from "sonner";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { PHASE_LABEL, seasonFor, SEASON_LABEL } from "@/lib/rhythm/horizons";
import type { useHorizonNote } from "@/lib/rhythm/horizon-notes";

type NoteApi = ReturnType<typeof useHorizonNote>;
interface Step { phase: RhythmPhase; title: string; prompts: string[]; extra?: React.ReactNode }

function UnfinishedTasks({ from, to, moveTo }: { from: Date; to: Date; moveTo: Date }) {
  const { state, updateTask } = useStore();
  const a = format(from, "yyyy-MM-dd"), b = format(to, "yyyy-MM-dd"), target = format(moveTo, "yyyy-MM-dd");
  const open = state.tasks.filter(t => !t.done && t.dueDate && t.dueDate >= a && t.dueDate <= b).slice(0, 8);
  if (!open.length) return <p className="text-sm text-muted-foreground">No unfinished tasks this week.</p>;
  return (
    <ul className="space-y-2">
      {open.map(t => (
        <li key={t.id} className="flex items-center gap-2 rounded-xl border bg-background p-2">
          <span className="min-w-0 flex-1 break-words text-sm">{t.title}</span>
          <Button size="sm" variant="outline" className="min-h-[40px]" onClick={() => updateTask(t.id, { dueDate: target })}>
            Move to {format(moveTo, "EEE")}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function GuidedReview({ kind, date, api }: { kind: "week" | "season"; date: Date; api: NoteApi }) {
  const steps: Step[] = useMemo(() => {
    if (kind === "week") {
      const ws = startOfWeek(date, { weekStartsOn: 1 });
      const nextMon = addDays(ws, 7);
      return [
        { phase: "letgo", title: "Let go of the week", prompts: ["What went well?", "What will I drop?"], extra: <UnfinishedTasks from={ws} to={addDays(ws, 6)} moveTo={nextMon} /> },
        { phase: "care", title: "Check in with yourself", prompts: ["How is my energy (1–5)?", "One kind thing for myself next week"] },
        { phase: "plan", title: "Plan the week ahead", prompts: ["My intention for next week", "My top 3"] },
        { phase: "grow", title: "Choose what grows", prompts: ["Which goal gets my focus?"], extra: <FocusGoalCard date={nextMon} /> },
      ];
    }
    const s = seasonFor(date);
    const next = seasonFor(addDays(s.end, 1));
    return [
      { phase: "letgo", title: `Close ${SEASON_LABEL[s.season]}`, prompts: ["My wins this season", "What I'm composting"] },
      { phase: "care", title: "Check your life areas", prompts: ["Which areas felt cared for?", "Which need more attention?"],
        extra: <Button asChild variant="outline" size="sm" className="min-h-[44px]"><Link to="/goals">Open seasonal goals <ArrowRight className="ml-1 h-4 w-4" /></Link></Button> },
      { phase: "plan", title: `Plan ${SEASON_LABEL[next.season]}`, prompts: ["Plan intention", "Grow intention"] },
      { phase: "grow", title: "Grow & tend next season", prompts: ["Care intention", "Let go intention"] },
    ];
  }, [kind, date]);

  const [i, setI] = useState(0);
  const step = steps[i];
  const heading = `## ${kind === "week" ? "Weekly reset" : "Season review"} · ${PHASE_LABEL[step.phase]}`;
  const saved = api.read(heading);
  const [text, setText] = useState(saved);
  useEffect(() => setText(saved), [saved, heading]);

  const saveAndGo = async (dir: 1 | -1) => {
    if (text.trim() !== saved.trim()) {
      try { await api.save(heading, text); } catch { toast.error("Couldn't save — try again"); return; }
    }
    if (dir === 1 && i === steps.length - 1) { toast.success(kind === "week" ? "Weekly reset saved" : "Season review saved"); return; }
    setI(v => Math.max(0, Math.min(steps.length - 1, v + dir)));
  };

  return (
    <section aria-label={kind === "week" ? "Sunday weekly reset" : "Seasonal review"} className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg">{kind === "week" ? "Sunday weekly reset" : "Seasonal review"}</h3>
        <span className="text-xs text-muted-foreground">Step {i + 1} of {steps.length}</span>
      </div>
      <div className="flex gap-1" aria-hidden>
        {steps.map((s, k) => (
          <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k <= i ? `hsl(var(--rhythm-${s.phase}-deep))` : `hsl(var(--rhythm-${s.phase}-tint))` }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <PhaseIcon phase={step.phase} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--rhythm-${step.phase}-deep))` }}>{PHASE_LABEL[step.phase]}</p>
          <p className="font-medium text-foreground">{step.title}</p>
        </div>
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">{step.prompts.map(p => <li key={p}>• {p}</li>)}</ul>
      {step.extra}
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write here…" aria-label={step.title} className="min-h-[110px] whitespace-pre-wrap break-words" />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" className="min-h-[44px]" disabled={i === 0} onClick={() => saveAndGo(-1)}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        <Button className="min-h-[44px]" onClick={() => saveAndGo(1)}>
          {i === steps.length - 1 ? "Finish" : "Save & next"}<ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
