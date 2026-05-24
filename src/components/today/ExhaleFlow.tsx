import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Wind, Sparkles, Heart, Leaf, Sunrise, ArrowRight, ArrowLeft, Check, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
}

type StepId = "settle" | "reflect" | "gratitude" | "release" | "tomorrow" | "close";

const STEPS: { id: StepId; label: string; icon: typeof Wind; tint: string }[] = [
  { id: "settle",    label: "Settle",    icon: Wind,     tint: "from-sky-400/25 to-sky-300/10" },
  { id: "reflect",   label: "Reflect",   icon: Sparkles, tint: "from-violet-400/25 to-violet-300/10" },
  { id: "gratitude", label: "Gratitude", icon: Heart,    tint: "from-rose-400/25 to-rose-300/10" },
  { id: "release",   label: "Release",   icon: Leaf,     tint: "from-emerald-400/25 to-emerald-300/10" },
  { id: "tomorrow",  label: "Tomorrow",  icon: Sunrise,  tint: "from-amber-400/25 to-amber-300/10" },
];

export function ExhaleFlow({ open, onOpenChange, date }: Props) {
  const { state, addJournal, updateTask } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const tomorrow = useMemo(() => addDays(date, 1), [date]);
  const tomorrowIso = format(tomorrow, "yyyy-MM-dd");

  const unfinished = useMemo(
    () => state.tasks.filter(t => t.dueDate === iso && !t.done && !t.parentTaskId),
    [state.tasks, iso],
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [reflection, setReflection] = useState("");
  const [gratitude, setGratitude] = useState<string[]>(["", "", ""]);
  const [release, setRelease] = useState("");
  const [carryIds, setCarryIds] = useState<Set<string>>(new Set());
  const [anchors, setAnchors] = useState<string[]>(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setReflection("");
      setGratitude(["", "", ""]);
      setRelease("");
      setCarryIds(new Set(unfinished.slice(0, 3).map(t => t.id)));
      setAnchors(["", "", ""]);
      setDone(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  const toggleCarry = (id: string) =>
    setCarryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const finish = async () => {
    setSaving(true);
    try {
      const grat = gratitude.map(g => g.trim()).filter(Boolean);
      const anchorList = anchors.map(a => a.trim()).filter(Boolean);
      const bodyParts: string[] = [];
      if (reflection.trim()) bodyParts.push(`**Reflection**\n${reflection.trim()}`);
      if (grat.length) bodyParts.push(`**Grateful for**\n${grat.map(g => `- ${g}`).join("\n")}`);
      if (release.trim()) bodyParts.push(`**Releasing**\n${release.trim()}`);
      if (anchorList.length || carryIds.size) {
        const carriedTitles = state.tasks.filter(t => carryIds.has(t.id)).map(t => t.title);
        const all = [...anchorList, ...carriedTitles];
        if (all.length) bodyParts.push(`**Tomorrow's anchors**\n${all.map(a => `- ${a}`).join("\n")}`);
      }

      const body = bodyParts.join("\n\n") || "Exhale.";

      // 1) Journal entry
      await addJournal({
        date: iso,
        type: "daily",
        template: "exhale",
        title: `Exhale — ${format(date, "MMM d")}`,
        body,
        gratitudeItems: grat,
        tags: ["exhale", ...(release.trim() ? ["release"] : [])],
        prompts: [
          "What landed in me today?",
          "What am I grateful for, however small?",
          "What can I set down before sleep?",
          "What do I want tomorrow to feel like?",
        ],
      });

      // 2) Carry unfinished tasks forward
      await Promise.all(
        Array.from(carryIds).map(id => updateTask(id, { dueDate: tomorrowIso, inbox: false })),
      );

      // 3) Create new anchor tasks for tomorrow (top of mind)
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (uid && anchorList.length) {
        await supabase.from("tasks").insert(
          anchorList.map((title, i) => ({
            user_id: uid,
            title,
            due_date: tomorrowIso,
            priority: "medium",
            area: "Personal",
            done: false,
            status: "active",
            is_top_three: i < 3,
            sort_order: i,
          })),
        );
      }

      setDone(true);
      setStepIdx(STEPS.length); // moves to closing screen
      toast("Exhaled. Sleep well. 🌙", { duration: 2400 });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save your exhale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden border-border/60 bg-card/95 p-0 backdrop-blur-xl">
        {/* Ambient gradient header */}
        <div
          className={cn(
            "relative bg-gradient-to-br p-6 transition-colors duration-700",
            done ? "from-emerald-400/25 to-sky-400/15" : (step?.tint ?? STEPS[0].tint),
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 80% at 80% 20%, hsl(var(--primary)/0.25), transparent 70%), radial-gradient(50% 70% at 15% 100%, hsl(var(--accent)/0.2), transparent 70%)",
            }}
          />
          <DialogHeader className="relative">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Wind className="h-3.5 w-3.5" /> Exhale · {format(date, "EEEE, MMM d")}
            </div>
            <DialogTitle className="font-display text-2xl font-semibold leading-tight">
              {done ? "It is enough." : titleFor(step.id)}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {done
                ? "Your reflections are saved. Tomorrow has a gentle starting point."
                : subtitleFor(step.id)}
            </DialogDescription>
          </DialogHeader>

          {!done && (
            <div className="relative mt-4 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    i < stepIdx ? "bg-primary" : i === stepIdx ? "bg-primary/70" : "bg-muted/60",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {done ? (
            <ClosingScreen
              tomorrow={tomorrow}
              gratitudeCount={gratitude.filter(g => g.trim()).length}
              carriedCount={carryIds.size}
              anchorCount={anchors.filter(a => a.trim()).length}
            />
          ) : step.id === "settle" ? (
            <SettleScreen />
          ) : step.id === "reflect" ? (
            <ReflectScreen value={reflection} onChange={setReflection} />
          ) : step.id === "gratitude" ? (
            <GratitudeScreen items={gratitude} onChange={setGratitude} />
          ) : step.id === "release" ? (
            <ReleaseScreen value={release} onChange={setRelease} />
          ) : (
            <TomorrowScreen
              unfinished={unfinished}
              carryIds={carryIds}
              onToggleCarry={toggleCarry}
              anchors={anchors}
              onAnchorChange={setAnchors}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-background/40 px-6 py-3 backdrop-blur">
          {done ? (
            <Button className="ml-auto rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={isFirst}
                onClick={() => setStepIdx(i => Math.max(0, i - 1))}
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1))}
                    className="text-muted-foreground"
                  >
                    Skip
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" disabled={saving} onClick={finish} className="rounded-full px-4">
                    {saving ? "Saving…" : (<><Check className="mr-1 h-3.5 w-3.5" /> Exhale</>)}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1))} className="rounded-full px-4">
                    Continue <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function titleFor(id: StepId) {
  switch (id) {
    case "settle":    return "Take a breath.";
    case "reflect":   return "What landed in you today?";
    case "gratitude": return "What softened your day?";
    case "release":   return "What can you set down?";
    case "tomorrow":  return "Prepare tomorrow, gently.";
    default:          return "Exhale";
  }
}
function subtitleFor(id: StepId) {
  switch (id) {
    case "settle":    return "No tasks here. Just a moment to arrive before reflecting.";
    case "reflect":   return "A sentence or two is plenty. Honest, not polished.";
    case "gratitude": return "Small counts. Warm tea. A kind text. A moment of quiet.";
    case "release":   return "Name something you don't want to carry into sleep.";
    case "tomorrow":  return "Carry forward what matters. Set 1–3 anchors so morning feels held.";
    default:          return "";
  }
}

/* ---------- step screens ---------- */

function SettleScreen() {
  return (
    <div className="grid place-items-center gap-4 py-6 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/30 opacity-50" style={{ animationDuration: "3s" }} />
        <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/20 text-primary shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)]">
          <Wind className="h-9 w-9" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-display text-base text-foreground/90">Breathe in for 4… hold for 4… exhale for 6.</p>
        <p className="text-xs text-muted-foreground">There is nothing to fix in the next few minutes. Just notice.</p>
      </div>
    </div>
  );
}

function ReflectScreen({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Today, I noticed…"
        rows={5}
        className="resize-none rounded-xl border-border/60 bg-background/60 text-sm leading-relaxed"
      />
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {["Today asked for…", "I'm proud of…", "I struggled with…", "I needed more of…"].map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(value ? `${value}\n${p} ` : `${p} `)}
            className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function GratitudeScreen({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  const set = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="space-y-2.5">
      {items.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-400/15 text-rose-400">
            <Heart className="h-3.5 w-3.5" />
          </span>
          <Input
            value={v}
            onChange={(e) => set(i, e.target.value)}
            placeholder={i === 0 ? "Something small and warm…" : i === 1 ? "Someone or something kind…" : "A moment to remember…"}
            className="rounded-xl border-border/60 bg-background/60"
          />
        </div>
      ))}
      <p className="px-1 text-[11px] text-muted-foreground">Optional. Fill in just the ones that arrive easily.</p>
    </div>
  );
}

function ReleaseScreen({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-emerald-400/5 p-3 text-xs text-muted-foreground">
        <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p>Releasing isn't forgetting. It's choosing not to carry it tonight.</p>
      </div>
      <Textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="I'm letting go of…"
        rows={4}
        className="resize-none rounded-xl border-border/60 bg-background/60 text-sm leading-relaxed"
      />
    </div>
  );
}

function TomorrowScreen({
  unfinished, carryIds, onToggleCarry, anchors, onAnchorChange,
}: {
  unfinished: { id: string; title: string }[];
  carryIds: Set<string>;
  onToggleCarry: (id: string) => void;
  anchors: string[];
  onAnchorChange: (v: string[]) => void;
}) {
  const set = (i: number, v: string) => {
    const next = [...anchors];
    next[i] = v;
    onAnchorChange(next);
  };
  return (
    <div className="space-y-4">
      {unfinished.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Carry forward
          </p>
          <ul className="space-y-1.5">
            {unfinished.slice(0, 8).map(t => {
              const checked = carryIds.has(t.id);
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border/50 bg-card/60 px-3 py-2 transition-colors",
                    checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40",
                  )}
                  onClick={() => onToggleCarry(t.id)}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggleCarry(t.id)} />
                  <span className="truncate text-sm">{t.title}</span>
                </li>
              );
            })}
            {unfinished.length > 8 && (
              <li className="px-1 text-[11px] italic text-muted-foreground">+ {unfinished.length - 8} more on today's list</li>
            )}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tomorrow's anchors
        </p>
        {anchors.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-500 text-xs font-semibold">
              {i + 1}
            </span>
            <Input
              value={v}
              onChange={(e) => set(i, e.target.value)}
              placeholder={i === 0 ? "The one thing that would feel like enough…" : "Optional"}
              className="rounded-xl border-border/60 bg-background/60"
            />
            {v && (
              <button type="button" aria-label="Clear" onClick={() => set(i, "")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ClosingScreen({
  tomorrow, gratitudeCount, carriedCount, anchorCount,
}: {
  tomorrow: Date;
  gratitudeCount: number;
  carriedCount: number;
  anchorCount: number;
}) {
  return (
    <div className="space-y-4 py-2 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-400/30 to-sky-400/20 text-emerald-500 shadow-[0_0_30px_-6px_hsl(var(--primary)/0.5)]">
        <Check className="h-7 w-7" />
      </div>
      <p className="font-display text-base text-foreground/85">
        You closed the day with intention.
      </p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Grateful for" value={gratitudeCount} />
        <Stat label="Carried over" value={carriedCount} />
        <Stat label="New anchors" value={anchorCount} />
      </div>
      <p className="text-xs text-muted-foreground">
        Tomorrow is {format(tomorrow, "EEEE, MMM d")}. It's waiting kindly.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 px-2 py-2.5">
      <div className="font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}