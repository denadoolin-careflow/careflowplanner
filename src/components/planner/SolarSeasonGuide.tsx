/**
 * Zodiac (solar) season planning guide for the planner.
 *
 * Shows the month's solar season — its theme, element and pacing advice —
 * with tappable focus / habit / meal suggestions that become real tasks on
 * the day you're looking at.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, ExternalLink, Plus, Sparkles, Sun } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import {
  solarSeasonFor, daysLeftInSolarSeason, ELEMENT_LABEL, ELEMENT_ACCENT,
} from "@/lib/planner/solar-season";

const OPEN_KEY = "careflow:planner:solar-season-open";

type Group = { key: string; label: string; items: string[]; area: string; emoji: string };

export function SolarSeasonGuide({ date, className }: { date: Date; className?: string }) {
  const season = solarSeasonFor(date);
  const { days, next } = daysLeftInSolarSeason(date);
  const { addTask } = useStore();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(OPEN_KEY) === "1";
  });
  const [added, setAdded] = useState<string[]>([]);

  const toggleOpen = (v: boolean) => {
    setOpen(v);
    try { window.localStorage.setItem(OPEN_KEY, v ? "1" : "0"); } catch { /* private mode */ }
  };

  const groups: Group[] = [
    { key: "focus", label: "Planning focus", items: season.focus, area: "Home", emoji: "🎯" },
    { key: "habits", label: "Habits that stick now", items: season.habits, area: "Self", emoji: "🌱" },
    { key: "meals", label: "Seasonal meals", items: season.meals, area: "Meals", emoji: "🍲" },
  ];

  const iso = format(date, "yyyy-MM-dd");

  const addSuggestion = async (title: string, area: string) => {
    if (added.includes(title)) return;
    setAdded(a => [...a, title]);
    try {
      await addTask({
        title,
        area: area as never,
        priority: "medium",
        done: false,
        dueDate: iso,
        estMinutes: 30,
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
      <div className={cn("bg-gradient-to-r", ELEMENT_ACCENT[season.element])}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left">
          <span aria-hidden className="text-base leading-none">{season.glyph}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[13px] font-semibold">{season.label}</span>
              <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {ELEMENT_LABEL[season.element]} · {season.modality}
              </span>
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{season.theme}</span>
          </span>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
            {days}d to {next.glyph}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="space-y-3 border-t border-border/50 px-3 py-3">
          <p className="text-[12px] leading-relaxed text-muted-foreground">{season.guidance}</p>

          <p className="flex items-start gap-1.5 rounded-xl bg-muted/50 px-2.5 py-2 text-[11px] text-muted-foreground">
            <Sun className="mt-[1px] h-3.5 w-3.5 shrink-0" aria-hidden />
            <span><span className="font-medium text-foreground">Energy:</span> {season.energy}</span>
          </p>

          {groups.map(g => (
            <section key={g.key} className="space-y-1.5">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.emoji} {g.label}
              </h4>
              <ul className="flex flex-wrap gap-1.5">
                {g.items.map(item => {
                  const done = added.includes(item);
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => void addSuggestion(item, g.area)}
                        aria-label={`Add “${item}” as a task on ${format(date, "MMMM d")}`}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors",
                          done
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-background/70 hover:bg-muted",
                        )}
                      >
                        {done ? <Sparkles className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
                        {item}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            <span>{days} days until {next.label}</span>
            <Link to="/cosmic-flow" className="inline-flex items-center gap-1 text-primary hover:underline">
              Cosmic Flow <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
