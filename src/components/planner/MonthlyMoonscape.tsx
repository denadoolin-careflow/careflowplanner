import { useMemo, useState } from "react";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { BookHeart, ExternalLink, Moon, NotebookPen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { getMoonAgeDays, getMoonPhase } from "@/lib/moon";
import { getMoonJournalContext } from "@/lib/planner/moon-journal-prompt";
import { KEY_PHASES, type KeyPhase } from "@/lib/lunar-phases";
import { getOrCreatePeriodNote, updateNote } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { logCosmicJournal } from "@/lib/cosmic/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TARGETS: { key: KeyPhase; age: number }[] = [
  { key: "sow", age: 0 }, { key: "grow", age: 29.53058867 / 4 },
  { key: "glow", age: 29.53058867 / 2 }, { key: "let-go", age: 29.53058867 * 0.75 },
];
const ELEMENT_GUIDE = { Fire: "Act on one clear spark.", Earth: "Ground it in a practical next step.", Air: "Name it, share it, or write it out.", Water: "Feel first; plan from what surfaces." } as const;

export function MonthlyMoonscape({ month, selectedDate, onSelectDate }: { month: Date; selectedDate: Date; onSelectDate: (date: Date) => void }) {
  const { state, addJournal, updateJournal } = useStore();
  const { settings, periods, loaded } = useCycle();
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month.getFullYear(), month.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const moments = useMemo(() => TARGETS.map(target => {
    const date = days.reduce((best, day) => {
      const age = getMoonAgeDays(day);
      const distance = Math.min(Math.abs(age - target.age), 29.53058867 - Math.abs(age - target.age));
      const bestAge = getMoonAgeDays(best);
      const bestDistance = Math.min(Math.abs(bestAge - target.age), 29.53058867 - Math.abs(bestAge - target.age));
      return distance < bestDistance ? day : best;
    }, days[0]);
    return { ...target, date, context: getMoonJournalContext(date), info: KEY_PHASES[target.key] };
  }), [days]);
  const initial = moments.findIndex(moment => format(moment.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"));
  const [activeKey, setActiveKey] = useState<KeyPhase>(moments[Math.max(0, initial)]?.key ?? "sow");
  const active = moments.find(moment => moment.key === activeKey) ?? moments[0];
  const journalTitle = `${active.info.label} · ${format(active.date, "MMMM d, yyyy")}`;
  const existing = state.journal.find(entry => entry.title === journalTitle);
  const [reflection, setReflection] = useState(existing?.body ?? "");
  const cycleDays = days.map(day => ({ day, info: settings.enabled ? getPhaseInfo(day, periods, settings) : null }));

  const choose = (key: KeyPhase) => {
    const next = moments.find(moment => moment.key === key);
    if (!next) return;
    setActiveKey(key); setReflection(state.journal.find(entry => entry.title === `${next.info.label} · ${format(next.date, "MMMM d, yyyy")}`)?.body ?? ""); onSelectDate(next.date);
  };
  const saveJournal = async () => {
    const body = reflection.trim() || active.context.seedBody;
    try {
      let entry = existing;
      if (entry) await updateJournal(entry.id, { body, prompts: active.context.prompts.map(prompt => prompt.text), tags: ["cosmic-flow", active.key, active.context.sign.name, active.context.sign.element] });
      else entry = await addJournal({ date: format(active.date, "yyyy-MM-dd"), type: "monthly", title: journalTitle, body, prompts: active.context.prompts.map(prompt => prompt.text), tags: ["cosmic-flow", active.key, active.context.sign.name, active.context.sign.element] });
      if (entry && !existing) await logCosmicJournal({ journal_entry_id: entry.id, event_id: `moon-${active.key}-${format(active.date, "yyyy-MM-dd")}`, event_kind: "phase", sign: active.context.sign.name, phase: getMoonPhase(active.date), event_date: format(active.date, "yyyy-MM-dd") });
      toast.success(existing ? "Reflection updated" : "Saved to Journal and Cosmic Flow");
    } catch { toast.error("Couldn't save the reflection"); }
  };
  const appendNote = async () => {
    try {
      const note = await getOrCreatePeriodNote("monthly", monthKeyFor(month));
      const block = `## ${journalTitle}\n\n${active.context.prompts[0].text}\n\n${reflection.trim() || ""}`;
      if (!note.body.includes(`## ${journalTitle}`)) await updateNote(note.id, { body: `${note.body.trim()}${note.body.trim() ? "\n\n" : ""}${block}\n` });
      toast.success(note.body.includes(`## ${journalTitle}`) ? "Already in the month note" : "Added to month note");
    } catch { toast.error("Couldn't update the month note"); }
  };

  return <section className="planner-moonscape" aria-labelledby="monthly-moonscape-title">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Monthly rhythm</p><h3 id="monthly-moonscape-title" className="font-display text-base font-semibold">Monthly moonscape</h3></div>
      <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs"><Link to="/cosmic-flow">Cosmic Flow <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
    </div>
    <div className="mt-3 grid grid-cols-4 gap-1" role="tablist" aria-label="Moon phases this month">
      {moments.map(moment => <button key={moment.key} type="button" role="tab" aria-selected={moment.key === active.key} onClick={() => choose(moment.key)} className={cn("min-w-0 rounded-md border border-border/50 px-1 py-2 text-center", moment.key === active.key ? "bg-primary-soft ring-1 ring-primary/40" : "bg-background/50")}>
        <span className="block text-lg" aria-hidden>{moment.info.glyph}</span><strong className="block truncate text-[10px]">{moment.info.verb}</strong><span className="block text-[9px] text-muted-foreground">{format(moment.date, "MMM d")}</span>
      </button>)}
    </div>
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-sm">{active.info.label}</strong><span className="text-xs text-muted-foreground">{active.context.sign.symbol} {active.context.sign.name} · {active.context.elementEmoji} {active.context.sign.element}</span></div>
      <p className="mt-1 text-xs text-muted-foreground">{ELEMENT_GUIDE[active.context.sign.element]} {active.info.invitation}</p>
      <p className="mt-2 text-sm">{active.context.prompts[0].text}</p>
      <Textarea value={reflection} onChange={event => setReflection(event.target.value)} placeholder="A few words is enough…" rows={3} className="mt-2 resize-none text-sm" />
      <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" onClick={() => void saveJournal()}><BookHeart className="mr-1 h-3.5 w-3.5" />{existing ? "Update reflection" : "Save to Journal"}</Button><Button size="sm" variant="outline" onClick={() => void appendNote()}><NotebookPen className="mr-1 h-3.5 w-3.5" />Add to month note</Button></div>
    </div>
    <div className="planner-rhythm-rails mt-4 space-y-2">
      <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Moon</span><div className="grid grid-cols-[repeat(var(--month-days),minmax(5px,1fr))] gap-px" style={{ "--month-days": days.length } as React.CSSProperties}>{days.map(day => { const moment = moments.find(item => format(item.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")); return <button key={day.toISOString()} type="button" onClick={() => onSelectDate(day)} className={cn("h-4 rounded-sm bg-muted/50", moment && "bg-calendar-cosmic/70", format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && "ring-1 ring-primary")} title={moment ? moment.info.label : format(day, "MMM d")} aria-label={moment ? `${moment.info.label}, ${format(day, "MMMM d")}` : format(day, "MMMM d")} />; })}</div></div>
      <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Cycle</span>{loaded && settings.enabled && periods.length ? <div className="grid grid-cols-[repeat(var(--month-days),minmax(5px,1fr))] gap-px" style={{ "--month-days": days.length } as React.CSSProperties}>{cycleDays.map(({ day, info }) => <button key={day.toISOString()} type="button" onClick={() => onSelectDate(day)} className={cn("h-4 rounded-sm", info?.phase === "menstrual" && "bg-phase-menstrual", info?.phase === "follicular" && "bg-phase-follicular", info?.phase === "ovulatory" && "bg-phase-ovulatory", info?.phase === "luteal" && "bg-phase-luteal", format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && "ring-1 ring-primary")} title={info ? `${PHASE_META[info.phase].label} · cycle day ${info.cycleDay}` : format(day, "MMM d")} aria-label={info ? `${format(day, "MMMM d")}, ${PHASE_META[info.phase].label}, cycle day ${info.cycleDay}` : format(day, "MMMM d")} />)}</div> : <Link to="/wellflow/cycle" className="text-xs text-muted-foreground underline-offset-4 hover:underline">Cycle tracking is private and off until you set it up.</Link>}</div>
    </div>
  </section>;
}