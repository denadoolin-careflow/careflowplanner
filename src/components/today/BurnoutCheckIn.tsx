import { useMemo, useState } from "react";
import { Heart, RotateCcw, Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useBurnoutCheckIn, BURNOUT_META, type BurnoutLevel } from "@/lib/burnout-checkin";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const LEVELS: BurnoutLevel[] = ["spacious", "steady", "tender", "depleted"];

export function BurnoutCheckIn({ date }: { date: Date }) {
  const { state } = useStore();
  const { entry, setLevel, setMvd, setMvdTaskId, reset } = useBurnoutCheckIn(date);
  const iso = format(date, "yyyy-MM-dd");
  const [picking, setPicking] = useState(false);

  const todays = useMemo(
    () => state.tasks.filter(
      t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked" && !t.done,
    ),
    [state.tasks, iso],
  );
  const mvdTask = entry.mvdTaskId ? todays.find(t => t.id === entry.mvdTaskId) : null;

  const tone = entry.level ? BURNOUT_META[entry.level].tone : "hsl(var(--primary))";

  const handleReset = () => {
    reset();
    toast("Reset. Breathe — pick one tender thing when you're ready.");
  };

  return (
    <section
      className="rounded-3xl border border-border/40 bg-card/60 p-4 shadow-soft backdrop-blur-xl sm:p-5"
      style={{
        backgroundImage:
          `radial-gradient(120% 90% at 0% 0%, ${tone}14, transparent 55%),` +
          "radial-gradient(120% 90% at 100% 100%, hsl(var(--accent)/0.08), transparent 55%)",
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2" style={{ color: tone }}>
          <Heart className="h-3.5 w-3.5" />
          <p className="text-[10px] uppercase tracking-[0.28em]">Capacity check-in</p>
        </div>
        {entry.level && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
            title="Reset after a hard day"
          >
            <RotateCcw className="h-3 w-3" /> Reset after a hard day
          </button>
        )}
      </header>

      <p className="mt-2 font-display text-sm italic text-foreground/85">
        How is your capacity for the rest of the day?
      </p>

      <div className="mt-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 sm:flex-wrap sm:overflow-visible">
        {LEVELS.map(lv => {
          const meta = BURNOUT_META[lv];
          const active = entry.level === lv;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => setLevel(active ? null : lv)}
              className={cn(
                "group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                active
                  ? "shadow-[0_0_0_3px_var(--ring-color)]"
                  : "border-border/60 bg-background/60 text-foreground/80 hover:border-foreground/30",
              )}
              style={
                active
                  ? ({ borderColor: meta.tone, color: meta.tone, ["--ring-color" as any]: `${meta.tone}33` } as any)
                  : undefined
              }
              aria-pressed={active}
              title={meta.hint}
            >
              <span aria-hidden>{meta.emoji}</span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {entry.level && (
        <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
          {BURNOUT_META[entry.level].hint}
        </p>
      )}

      {/* MVD toggle row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/50 px-3 py-2.5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Minimum viable day
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Pick one tender thing. The debrief will protect it and soften the rest.
          </p>
        </div>
        <Switch checked={entry.mvd} onCheckedChange={setMvd} />
      </div>

      {entry.mvd && (
        <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5">
          {mvdTask ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary/80">One tender thing</p>
                <p className="truncate text-sm font-medium text-foreground">{mvdTask.title}</p>
              </div>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80 hover:text-foreground"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setMvdTaskId(null)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear minimum viable day task"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="w-full rounded-xl border border-dashed border-primary/40 bg-background/40 px-3 py-2 text-left text-[12px] text-primary/90 hover:bg-background/60"
            >
              + Pick the one tender thing for today
            </button>
          )}

          {picking && (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/40 bg-background/70 p-1">
              {todays.length === 0 && (
                <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                  Nothing on the plate. Add something to today first.
                </p>
              )}
              {todays.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setMvdTaskId(t.id); setPicking(false); }}
                  className="block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[12px] text-foreground/85 hover:bg-primary/10"
                >
                  {t.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="block w-full rounded-lg px-2.5 py-1.5 text-center text-[11px] text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}