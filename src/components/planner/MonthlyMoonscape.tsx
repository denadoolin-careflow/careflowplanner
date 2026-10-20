import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { BookHeart, ExternalLink, NotebookPen, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { MOON_RITUALS } from "@/lib/astro-suite/lunar";
import { getMoonJournalContext } from "@/lib/planner/moon-journal-prompt";
import { KEY_PHASES } from "@/lib/lunar-phases";
import { monthRhythmMoments } from "@/lib/cosmic/lunar-rhythm";
import { LunarDateConnections } from "@/components/cosmic/LunarDateConnections";
import { getOrCreatePeriodNote, updateNote } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { logCosmicJournal } from "@/lib/cosmic/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CycleLogSheet } from "@/components/cycle/CycleLogSheet";
import { MonthlyPhaseIntentions } from "./MonthlyPhaseIntentions";

const LEGACY_KEY = { plan: "sow", grow: "grow", care: "glow", letgo: "let-go" } as const;
const PRINCIPAL = { plan: "new", grow: "first-quarter", care: "full", letgo: "last-quarter" } as const;
const ELEMENT_GUIDE = { Fire: "Act on one clear spark.", Earth: "Ground it in a practical next step.", Air: "Name it, share it, or write it out.", Water: "Feel first; plan from what surfaces." } as const;

export function MonthlyMoonscape({ month, selectedDate, onSelectDate }: { month: Date; selectedDate: Date; onSelectDate: (date: Date) => void }) {
  const { state, addJournal, updateJournal } = useStore();
  const { settings, periods, loaded } = useCycle();
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month.getFullYear(), month.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const moments = useMemo(() => monthRhythmMoments(month).map(moment => {
    const context = getMoonJournalContext(moment.date);
    const ritual = MOON_RITUALS[PRINCIPAL[moment.phase]];
    const prompts = [{ id: "phase", label: ritual.label, text: ritual.tarotPrompt }, ...context.prompts.slice(1)];
    return { ...moment, key: LEGACY_KEY[moment.phase], context: { ...context, prompts, seedBody: `${moment.info.label} · ${moment.info.moon}\n\n${prompts.map(p => p.text).join("\n\n")}` } };
  }), [month.getFullYear(), month.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const matching = moments.find(moment => format(moment.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"));
    const preceding = moments.filter(moment => moment.date <= selectedDate).at(-1);
    setActiveId((matching ?? preceding ?? moments[0])?.id ?? "");
  }, [moments, selectedDate]);
  const active = moments.find(moment => moment.id === activeId) ?? moments[0];
  const journalTitle = `${active.info.label} · ${active.info.moon} · ${format(active.date, "MMMM d, yyyy")}`;
  const legacyTitle = `${KEY_PHASES[active.key].label} · ${format(active.date, "MMMM d, yyyy")}`;
  const existing = state.journal.find(entry => entry.title === journalTitle || entry.title === legacyTitle);
  const [reflection, setReflection] = useState(existing?.body ?? "");
  const [cycleEditorOpen, setCycleEditorOpen] = useState(false);
  useEffect(() => { setReflection(existing?.body ?? ""); }, [journalTitle, existing?.body]);
  const cycleDays = days.map(day => ({ day, info: settings.enabled ? getPhaseInfo(day, periods, settings) : null }));

  const choose = (id: string) => {
    const next = moments.find(moment => moment.id === id);
    if (!next) return;
    setActiveId(id); onSelectDate(next.date);
  };
  const saveJournal = async () => {
    const body = reflection.trim() || active.context.seedBody;
    try {
      let entry = existing;
      if (entry) await updateJournal(entry.id, { body, prompts: active.context.prompts.map(prompt => prompt.text), tags: ["cosmic-flow", active.key, active.context.sign.name, active.context.sign.element] });
      else entry = await addJournal({ date: format(active.date, "yyyy-MM-dd"), type: "monthly", title: journalTitle, body, prompts: active.context.prompts.map(prompt => prompt.text), tags: ["cosmic-flow", active.key, active.context.sign.name, active.context.sign.element] });
      if (entry && !existing) await logCosmicJournal({ journal_entry_id: entry.id, event_id: `moon-${active.key}-${format(active.date, "yyyy-MM-dd")}`, event_kind: "phase", sign: active.context.sign.name, phase: PRINCIPAL[active.phase], event_date: format(active.date, "yyyy-MM-dd") });
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
      <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0 px-2 text-xs sm:min-h-8"><Link to="/cosmic-flow">Cosmic Flow <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
    </div>
    <MonthlyPhaseIntentions key={monthKeyFor(month)} month={month} />
    <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Moon phases this month">
      {moments.map(moment => <Button variant="ghost" key={moment.id} type="button" role="tab" aria-selected={moment.id === active.id} onClick={() => choose(moment.id)} className={cn("h-auto min-w-16 flex-1 flex-col rounded-md border border-border/50 px-1 py-2 text-center", moment.id === active.id ? "bg-primary-soft ring-1 ring-primary/40" : "bg-background/50")}>
        <span className="block text-lg" aria-hidden>{moment.info.glyph}</span><strong className="block truncate text-[10px]">{moment.info.label}</strong><span className="block text-[9px] text-muted-foreground">{format(moment.date, "MMM d")}</span>
      </Button>)}
    </div>
    <div className="mt-3 border-t border-border/50 pt-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="text-sm">{active.info.label} · {active.info.moon}</strong><span className="text-xs text-muted-foreground">{active.context.sign.symbol} {active.context.sign.name} · {active.context.elementEmoji} {active.context.sign.element}</span></div>
      <p className="mt-1 text-xs text-muted-foreground">{ELEMENT_GUIDE[active.context.sign.element]} {active.info.invitation}</p>
      {active.eclipseSeason && <p className="mt-2 text-xs text-muted-foreground">Near the lunar nodes — a possible eclipse window, not a confirmed eclipse. Keep plans flexible and choose rest over pressure.</p>}
      <LunarDateConnections date={active.date} phase={active.phase} current="planner" />
      <p className="mt-2 text-sm">{active.context.prompts[0].text}</p>
      <Textarea value={reflection} onChange={event => setReflection(event.target.value)} placeholder="A few words is enough…" rows={3} className="mt-2 resize-none text-sm" />
      <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" className="min-h-11 sm:min-h-9" onClick={() => void saveJournal()}><BookHeart className="mr-1 h-3.5 w-3.5" />{existing ? "Update reflection" : "Save to Journal"}</Button><Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => void appendNote()}><NotebookPen className="mr-1 h-3.5 w-3.5" />Add to month note</Button></div>
    </div>
    <div className="planner-rhythm-rails mt-4 space-y-2">
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2"><span className="text-[10px] font-semibold uppercase text-muted-foreground">Moon</span><div className="overflow-x-auto pb-1"><div className="grid grid-cols-[repeat(var(--month-days),minmax(44px,1fr))] gap-1 sm:grid-cols-[repeat(var(--month-days),minmax(5px,1fr))] sm:gap-px" style={{ "--month-days": days.length } as CSSProperties}>{days.map(day => { const moment = moments.find(item => format(item.date, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")); return <Button variant="ghost" key={day.toISOString()} type="button" onClick={() => onSelectDate(day)} className={cn("grid h-11 min-w-0 place-items-center rounded-sm p-0 sm:h-5 bg-muted/50 text-[8px]", moment && "bg-calendar-cosmic/70", format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && "ring-1 ring-primary")} title={moment ? `${moment.info.label} · ${format(day, "MMM d")}` : format(day, "MMM d")} aria-label={moment ? `${moment.info.label}, ${format(day, "MMMM d")}` : format(day, "MMMM d")}><span className="text-xs sm:hidden">{format(day, "d")}</span>{moment?.info.glyph}</Button>; })}</div></div></div>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2"><Button type="button" variant="ghost" size="sm" className="h-11 justify-start sm:h-7 px-0 text-[10px] font-semibold uppercase text-muted-foreground" onClick={() => setCycleEditorOpen(true)}>Cycle <Pencil className="ml-1 h-3 w-3" /></Button>{loaded && settings.enabled && periods.length ? <div className="overflow-x-auto pb-1"><div className="grid grid-cols-[repeat(var(--month-days),minmax(44px,1fr))] gap-1 sm:grid-cols-[repeat(var(--month-days),minmax(5px,1fr))] sm:gap-px" style={{ "--month-days": days.length } as CSSProperties}>{cycleDays.map(({ day, info }, index) => { const prior = index > 0 ? cycleDays[index - 1].info?.phase : null; const phaseStart = info && prior !== info.phase; return <Button variant="ghost" key={day.toISOString()} type="button" onClick={() => { onSelectDate(day); setCycleEditorOpen(true); }} className={cn("grid h-11 min-w-0 place-items-center rounded-sm p-0 sm:h-5 bg-muted/40 text-[8px]", info?.phase === "menstrual" && "bg-rose-400/60", info?.phase === "follicular" && "bg-emerald-400/60", info?.phase === "ovulatory" && "bg-amber-400/60", info?.phase === "luteal" && "bg-violet-400/60", format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") && "ring-1 ring-primary")} title={info ? `${PHASE_META[info.phase].glyph} ${PHASE_META[info.phase].label} · cycle day ${info.cycleDay}` : format(day, "MMM d")} aria-label={info ? `${format(day, "MMMM d")}, ${PHASE_META[info.phase].label}, cycle day ${info.cycleDay}` : format(day, "MMMM d")}><span className="text-xs sm:hidden">{format(day, "d")}</span>{phaseStart ? PHASE_META[info.phase].glyph : ""}</Button>; })}</div></div> : <Link to="/wellflow/cycle" className="text-xs text-muted-foreground underline-offset-4 hover:underline">Cycle tracking is private and off until you set it up.</Link>}</div>
    </div>
    <CycleLogSheet open={cycleEditorOpen} onOpenChange={setCycleEditorOpen} date={selectedDate} />
  </section>;
}