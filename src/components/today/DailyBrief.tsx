import { useEffect, useState, useCallback, useMemo } from "react";
import { format, parseISO, isBefore, addDays, startOfDay } from "date-fns";
import { Sparkles, RefreshCw, Loader2, CalendarClock, AlertCircle, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { MOON_INFO } from "@/lib/moon";
import { openTaskEditor } from "@/lib/open-task-editor";
import { playCompletionChime } from "@/lib/completion-sound";
import { toast } from "sonner";
import { QuickTaskInlineEditor } from "@/components/tasks/QuickTaskInlineEditor";
import { aiInvoke } from "@/lib/ai-invoke";
import { apptOccursOn } from "@/lib/appointment-range";

const cacheKey = (iso: string) => `careflow:daily-brief:${iso}`;

export function DailyBrief({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const today = startOfDay(date);
  const { state, toggleTask } = useStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "today" | "overdue" | "appts" | "moon">(null);
  const forecast = useMemo(() => getRhythmForecast(date), [date]);

  const buckets = useMemo(() => {
    const tomorrowISO = format(addDays(today, 1), "yyyy-MM-dd");
    const weekEnd = addDays(today, 7);
    const overdue: any[] = []; const todays: any[] = []; const tomorrow: any[] = []; const upcoming: any[] = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.status === "parked" || !t.dueDate) continue;
      const d = parseISO(t.dueDate);
      if (t.dueDate === iso) todays.push(t);
      else if (t.dueDate === tomorrowISO) tomorrow.push(t);
      else if (isBefore(d, today)) overdue.push(t);
      else if (isBefore(d, weekEnd)) upcoming.push(t);
    }
    return { overdue, todays, tomorrow, upcoming };
  }, [state.tasks, iso, today]);

  const appts = state.appointments.filter(a => a.date === iso);
  const topThree = buckets.todays.filter(t => t.isTopThree).slice(0, 3);

  useEffect(() => {
    try { const c = localStorage.getItem(cacheKey(iso)); if (c) setText(c); } catch {}
    setError(null);
  }, [iso]);

  const generate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const lite = (t: any) => ({ title: t.title, dueDate: t.dueDate, isTopThree: t.isTopThree, area: t.area });
      const { data, error: fnErr } = await aiInvoke("ai-daily-update", {
        body: {
          date: iso,
          overdue: buckets.overdue.map(lite),
          today: buckets.todays.map(lite),
          tomorrow: buckets.tomorrow.map(lite),
          upcoming: buckets.upcoming.map(lite),
          appointments: appts.map(a => ({ title: a.title, date: a.date, time: a.time })),
          topThree: topThree.map(t => t.title),
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const next = (data?.update as string) ?? "";
      setText(next);
      try { localStorage.setItem(cacheKey(iso), next); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate brief.");
    } finally { setLoading(false); }
  }, [iso, buckets, appts, topThree]);

  return (
    <section aria-label="Daily brief" className="cozy-card overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Daily Brief
        </div>
        <span className="text-[10px] text-muted-foreground">{format(date, "EEE MMM d")}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Today" value={buckets.todays.length} icon={<CalendarClock className="h-3 w-3" />} onClick={() => setDialog("today")} />
        <Stat label="Overdue" value={buckets.overdue.length} icon={<AlertCircle className="h-3 w-3" />} tone={buckets.overdue.length ? "warn" : "muted"} onClick={() => setDialog("overdue")} />
        <Stat label="Appts" value={appts.length} icon={<CalendarClock className="h-3 w-3" />} onClick={() => setDialog("appts")} />
        <Stat
          label="Moon"
          value={`${forecast.phaseLabel} in ${forecast.sign.sign}`}
          icon={<Star className="h-3 w-3" />}
          compact
          onClick={() => setDialog("moon")}
        />
      </div>

      {topThree.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top 3</div>
          <ul className="mt-1 space-y-0.5">
            {topThree.map(t => (
              <li key={t.id} className="truncate text-xs">• {t.title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-muted/40 p-3">
        {text ? (
          <p className="text-[13px] leading-relaxed text-foreground/90">{text}</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting your brief…</p>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">Tap “Generate” for a personalized briefing on your day.</p>
        )}
        <div className="mt-2">
          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={generate} disabled={loading}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {text ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      <BriefDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        kind={dialog}
        date={date}
        tasks={dialog === "today" ? buckets.todays : dialog === "overdue" ? buckets.overdue : []}
        appts={dialog === "appts" ? appts : []}
        forecast={forecast}
        onComplete={async (id, title) => {
          await toggleTask(id);
          try { playCompletionChime(); } catch {}
          toast.success(`Completed “${title}”`);
        }}
      />
    </section>
  );
}

function Stat({ label, value, icon, tone = "default", compact = false, onClick }: { label: string; value: string | number; icon: React.ReactNode; tone?: "default" | "warn" | "muted"; compact?: boolean; onClick?: () => void }) {
  const toneCls = tone === "warn" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`rounded-lg border border-border/50 bg-card/40 p-2 text-left transition-colors ${onClick ? "hover:bg-muted/60 cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{icon} {label}</div>
      <div className={`mt-0.5 ${compact ? "text-xs font-medium" : "text-lg font-semibold"} ${toneCls}`}>{value}</div>
    </Comp>
  );
}

function BriefDialog({
  open, onClose, kind, date, tasks, appts, forecast, onComplete,
}: {
  open: boolean;
  onClose: () => void;
  kind: null | "today" | "overdue" | "appts" | "moon";
  date: Date;
  tasks: any[];
  appts: any[];
  forecast: ReturnType<typeof getRhythmForecast>;
  onComplete: (id: string, title: string) => Promise<void> | void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const titleMap: Record<string, string> = {
    today: `Today · ${format(date, "EEE MMM d")}`,
    overdue: "Overdue tasks",
    appts: `Appointments · ${format(date, "EEE MMM d")}`,
    moon: "Tonight's moon",
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-base sm:text-lg">{kind ? titleMap[kind] : ""}</DialogTitle>
        </DialogHeader>
        {kind === "moon" ? (
          <MoonDetail forecast={forecast} date={date} />
        ) : kind === "appts" ? (
          <div className="min-w-0 space-y-1">
            {appts.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No appointments.</p>}
            {appts.map(a => (
              <div key={a.id} className="min-w-0 rounded-md border border-border/50 p-2">
                <div className="break-words text-sm font-medium">{a.title}</div>
                <div className="break-words text-[11px] text-muted-foreground">{a.time ?? "All day"}{a.location ? ` · ${a.location}` : ""}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-0 space-y-1">
            {tasks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nothing here. Nicely done.</p>}
            {tasks.map(t => (
              <div key={t.id} className="min-w-0 rounded-md border border-border/50">
                <div className="group flex min-w-0 items-center gap-2 p-2 hover:bg-muted/40">
                  <button
                    className="group/check relative h-4 w-4 shrink-0 rounded-full border border-border transition-all hover:border-transparent hover:shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
                    title="Mark complete"
                    onClick={() => onComplete(t.id, t.title)}
                    aria-label={`Complete ${t.title}`}
                  >
                    <span
                      className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover/check:opacity-100"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}
                    />
                  </button>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                  >
                    <div className="break-words text-sm font-medium">{t.title}</div>
                    <div className="break-words text-[11px] text-muted-foreground">
                      {t.dueDate ? format(parseISO(t.dueDate), "EEE MMM d") : "No date"}
                      {t.area ? ` · ${t.area}` : ""}
                    </div>
                  </button>
                  <Button
                    variant="ghost" size="icon" className="hidden h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex"
                    title="Quick edit"
                    onClick={(e) => { e.stopPropagation(); setEditingId(editingId === t.id ? null : t.id); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[11px]"
                    onClick={() => { onClose(); openTaskEditor(t.id); }}
                  >Open</Button>
                </div>
                {editingId === t.id && (
                  <div className="border-t border-border/50 p-2">
                    <QuickTaskInlineEditor taskId={t.id} onClose={() => setEditingId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoonDetail({ forecast, date }: { forecast: ReturnType<typeof getRhythmForecast>; date: Date }) {
  const info = MOON_INFO[forecast.phase];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="text-4xl">{info.glyph}</div>
        <div>
          <div className="font-display text-base">{forecast.phaseLabel} in {forecast.sign.sign} {forecast.sign.glyph}</div>
          <div className="text-[11px] text-muted-foreground">{format(date, "EEEE, MMMM d")} · {forecast.illumination}% lit</div>
        </div>
      </div>
      <p className="rounded-md bg-muted/40 p-3 text-sm italic text-foreground/85">{info.invitation}</p>
      <p className="text-xs text-muted-foreground">{forecast.sign.insight}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Affirmation</p>
      <p className="text-sm">{info.affirmation}</p>
    </div>
  );
}