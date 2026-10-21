import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Moon, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { moonEventsOnDay, moonSignOn, astroSeekUrl, moonBlockFor, getMoonGuidePrefs, type MoonGuidePrefs } from "@/lib/cosmic/moon-aspects";
import { cn } from "@/lib/utils";

export function useMoonGuidePrefs(): MoonGuidePrefs {
  const [p, setP] = useState(getMoonGuidePrefs);
  useEffect(() => {
    const on = () => setP(getMoonGuidePrefs());
    window.addEventListener("careflow:moon-guide-prefs", on);
    return () => window.removeEventListener("careflow:moon-guide-prefs", on);
  }, []);
  return p;
}

const checksKey = (d: string) => `careflow:moon-guide-checks:${d}`;

export function MoonAspectGuide({ date, compact, className }: { date: Date; compact?: boolean; className?: string }) {
  const iso = format(date, "yyyy-MM-dd");
  const events = useMemo(() => moonEventsOnDay(date), [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const { state, addTask } = useStore();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const isScheduled = (title: string) => added.has(`${iso}|${title}`) || state.tasks.some(t => t.dueDate === iso && t.title.trim() === title.trim());
  const schedule = async (e: (typeof events)[number]) => {
    const b = moonBlockFor(e);
    if (isScheduled(b.title)) return;
    setAdded(prev => new Set(prev).add(`${iso}|${b.title}`));
    await addTask({ title: b.title, area: "Personal", priority: "medium", done: false, dueDate: iso, startTime: b.startTime, endTime: b.endTime, estMinutes: b.estMinutes, inbox: false } as any);
    toast.success(`Added ${format(new Date(`${iso}T${b.startTime}`), "h:mm a")} block to your day`);
  };
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setChecks(JSON.parse(localStorage.getItem(checksKey(iso)) || "{}")); } catch { setChecks({}); } }, [iso]);
  const ingress = events.find(e => e.kind === "ingress");
  const signLine = ingress ? `Moon ${moonSignOn(date)} → ${ingress.sign}` : `Moon in ${moonSignOn(date)}`;
  const toggle = (k: string) => {
    const next = { ...checks, [k]: !checks[k] };
    setChecks(next); localStorage.setItem(checksKey(iso), JSON.stringify(next));
  };
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-soft", className)} aria-label="Moon aspects">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-display text-lg leading-snug"><Moon className="h-4 w-4 shrink-0 text-primary" />Moon aspects · {signLine}</h2>
        <div className="flex gap-3 text-xs">
          {compact && <Link className="text-primary underline-offset-2 hover:underline min-h-11 px-1 inline-flex items-center" to={`/cosmic-flow/moon?date=${iso}`}>Full guide</Link>}
          <a className="inline-flex min-h-11 px-1 items-center gap-1 text-muted-foreground hover:text-foreground" href={astroSeekUrl()} target="_blank" rel="noreferrer">Astro-Seek <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
      {events.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No exact Moon aspects today — a steady day.</p> : (
        <ol className={cn("mt-3", compact ? "space-y-2" : "space-y-3")}>
          {events.map(e => (
            <li key={e.id} className={cn("rounded-xl bg-muted/40", compact ? "px-3 py-2" : "p-3")}>
              <div className="flex items-start gap-2"><p className="min-w-0 flex-1 break-words pt-2 text-sm font-semibold"><span className="tabular-nums text-primary">{format(e.time, "h:mm a")}</span> · {e.label}{e.kind === "aspect" && <span className="font-normal text-muted-foreground"> in {e.sign}</span>}</p>
                {(() => { const done = isScheduled(moonBlockFor(e).title); return (
                  <Button type="button" size="sm" variant={done ? "ghost" : "outline"} disabled={done} onClick={() => schedule(e)}
                    className="h-11 shrink-0 rounded-full px-3 text-xs" aria-label={done ? `${e.label} is scheduled` : `Schedule ${e.label}`}>
                    {done ? <><Check className="mr-1 h-3.5 w-3.5" />Scheduled</> : <><Plus className="mr-1 h-3.5 w-3.5" />Schedule</>}
                  </Button>); })()}
              </div>
              {!compact && <p className="mt-0.5 text-sm text-muted-foreground">{e.advice}</p>}
              <div className={compact ? "mt-1" : "mt-2 space-y-1"}>
                {e.actions.map(a => {
                  const k = `${e.id}:${a}`;
                  return (
                    <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm active:bg-muted/60">
                      <Checkbox className="h-5 w-5 shrink-0" checked={!!checks[k]} onCheckedChange={() => toggle(k)} />
                      <span className={cn("min-w-0 break-words", checks[k] && "line-through text-muted-foreground")}>{a}</span>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Times are exact for your device's time zone, calculated on this device.</p>
    </section>
  );
}
