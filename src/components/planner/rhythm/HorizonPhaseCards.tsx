import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PhaseIcon } from "@/lib/phase-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { HORIZON_PHASES, PHASES, PHASE_LABEL, sectionHeading, type Horizon } from "@/lib/rhythm/horizons";
import type { useHorizonNote } from "@/lib/rhythm/horizon-notes";

type NoteApi = ReturnType<typeof useHorizonNote>;

function PhaseCard({ horizon, phase, current, api }: { horizon: Horizon; phase: RhythmPhase; current: boolean; api: NoteApi }) {
  const def = HORIZON_PHASES[horizon][phase];
  const heading = sectionHeading(horizon, phase);
  const saved = api.read(heading);
  const [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(saved), [saved]);
  const dirty = text.trim() !== saved.trim();

  return (
    <article
      aria-label={`${PHASE_LABEL[phase]}: ${def.name}`}
      className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4", current && "ring-2")}
      style={{ borderColor: `hsl(var(--rhythm-${phase}-tint))`, ...(current ? { ["--tw-ring-color" as string]: `hsl(var(--rhythm-${phase}-deep))` } : {}) }}
    >
      <header className="flex items-start gap-3">
        <PhaseIcon phase={phase} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: `hsl(var(--rhythm-${phase}-deep))` }}>
            {PHASE_LABEL[phase]} · {def.when}
          </p>
          <h3 className="font-display text-lg leading-tight text-foreground">{def.name}</h3>
        </div>
        {current && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` }}>
            You are here
          </span>
        )}
      </header>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {def.prompts.map(p => <li key={p}>• {p}</li>)}
      </ul>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write here…"
        aria-label={`${def.name} notes`}
        className="min-h-[96px] resize-y whitespace-pre-wrap break-words"
        disabled={!api.note && !api.error}
      />
      <div className="flex justify-end">
        <Button
          size="sm" disabled={!dirty || busy} className="min-h-[44px]"
          onClick={async () => {
            setBusy(true);
            try { await api.save(heading, text); toast.success("Saved to your notebook"); }
            catch { toast.error("Couldn't save — try again"); }
            finally { setBusy(false); }
          }}
        >
          <Check className="mr-1 h-4 w-4" />{saved ? "Update" : "Save"}
        </Button>
      </div>
    </article>
  );
}

export function HorizonPhaseCards({ horizon, currentPhase, api }: { horizon: Horizon; currentPhase: RhythmPhase | null; api: NoteApi }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {PHASES.map(p => <PhaseCard key={p} horizon={horizon} phase={p} current={currentPhase === p} api={api} />)}
    </div>
  );
}
