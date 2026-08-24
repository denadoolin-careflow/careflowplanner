/**
 * Cycle planning guide for the planner.
 *
 * Sits beside the solar-season guide and translates the current cycle phase
 * into a shape for the day: how many priorities are realistic, block length,
 * windows worth protecting, and one-tap priorities you can drop on the day.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, ExternalLink, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { useCycleSuggestion } from "@/lib/planner/cycle-templates";
import { PHASE_META } from "@/lib/cycle";

const OPEN_KEY = "careflow:planner:cycle-guide-open";

export function CyclePlanningGuide({ date, className }: { date: Date; className?: string }) {
  const cycle = useCycleDot(date);
  const suggestion = useCycleSuggestion(date);
  const { addTask } = useStore();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OPEN_KEY) === "1";
  });
  const [added, setAdded] = useState<string[]>([]);

  if (!cycle || !suggestion) return null;

  const meta = PHASE_META[cycle.phase];
  const { shape, dayNudge, weekNudge, priorityHints } = suggestion;
  const iso = format(date, "yyyy-MM-dd");

  const toggleOpen = (v: boolean) => {
    setOpen(v);
    try { window.localStorage.setItem(OPEN_KEY, v ? "1" : "0"); } catch { /* private mode */ }
  };

  const addPriority = async (title: string) => {
    if (added.includes(title)) return;
    setAdded(a => [...a, title]);
    try {
      await addTask({
        title,
        area: (shape.areas[0] ?? "Personal") as never,
        priority: "high",
        done: false,
        dueDate: iso,
        estMinutes: shape.blockMinutes,
        inbox: false,
      } as never);
      toast.success(`Added “${title}”`);
    } catch {
      setAdded(a => a.filter(t => t !== title));
      toast.error("Couldn't add that one");
    }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={toggleOpen}
      className={cn("overflow-hidden rounded-2xl border border-border/60 bg-card/60", className)}
    >
      <div style={{ background: `linear-gradient(90deg, ${cycle.soft}, transparent)` }}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
          <span aria-hidden className="text-base leading-none">{cycle.glyph}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[13px] font-semibold">{cycle.label} phase</span>
              <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Day {cycle.cycleDay}
              </span>
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{meta.invitation}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="space-y-3 border-t border-border/50 px-3 py-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">{dayNudge}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl bg-muted/50 px-2.5 py-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Priorities</span>
              <span className="font-medium text-foreground">{shape.priorities} today</span>
            </div>
            <div className="rounded-xl bg-muted/50 px-2.5 py-2">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Block length</span>
              <span className="font-medium text-foreground">{shape.blockMinutes} min</span>
            </div>
          </div>

          {shape.protect.length > 0 && (
            <ul className="space-y-1">
              {shape.protect.map(p => (
                <li key={`${p.from}-${p.to}`} className="flex items-start gap-1.5 rounded-xl bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span><span className="font-medium text-foreground">{p.why}:</span> {p.from}–{p.to}</span>
                </li>
              ))}
            </ul>
          )}

          <section className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              ✨ Priorities that fit this phase
            </h4>
            <ul className="flex flex-wrap gap-1.5">
              {priorityHints.map(hint => {
                const done = added.includes(hint);
                return (
                  <li key={hint}>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => void addPriority(hint)}
                      aria-label={`Add “${hint}” as a task on ${format(date, "MMMM d")}`}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors",
                        done
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/70 hover:bg-muted",
                      )}
                    >
                      {done ? <Sparkles className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                      {hint}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              🌿 Best for now
            </h4>
            <p className="text-[11px] text-muted-foreground">{meta.planningHints.join(" · ")}</p>
          </section>

          <p className="rounded-xl bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">This week:</span> {weekNudge}
          </p>

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            <span>{meta.affirmation}</span>
            <Link to="/cycle" className="inline-flex items-center gap-1 text-primary hover:underline">
              Cycle <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
