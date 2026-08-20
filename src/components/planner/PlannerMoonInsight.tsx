import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ChevronDown, ExternalLink, Loader2, NotebookPen, RotateCcw, Save, Share2, Sparkles, Stars, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getMoonPhase, MOON_INFO, getIllumination, daysUntilFull, daysUntilNew } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { createNote, getDailyNote, updateNote, type Note } from "@/lib/notes";
import { useTimeAllocation } from "@/lib/planner/time-allocation";
import { getMoonJournalContext } from "@/lib/planner/moon-journal-prompt";
import { useCycleDot } from "@/lib/planner/day-rhythm";
import { moonPlanningTip } from "@/lib/planner/moon-planning-tip";
import { PhaseHabitNudge } from "./PhaseHabitNudge";
import { MoonInsightHistory } from "./MoonInsightHistory";
import { PlannerWeatherStrip } from "./PlannerWeatherStrip";
import { elementTheme } from "@/lib/planner/element-theme";
import { buildMoonInsightPdf, shareOrDownloadPdf } from "@/lib/planner/moon-insight-pdf";
import {
  DAILY_NOTE_PLACEHOLDERS,
  renderDailyNoteTemplate,
  useDailyNoteTemplate,
} from "@/lib/daily-note-template";

const OPEN_KEY = "careflow:planner:moon-insight-open";

/** Debounced autosave helper. */
function useDebouncedSave(save: (payload: { title: string; body: string }) => Promise<void>, delay = 900) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<{ title: string; body: string } | null>(null);

  const run = useCallback(async () => {
    const payload = queue.current;
    if (!payload) return;
    setStatus("saving");
    try { await save(payload); setStatus("saved"); }
    catch { setStatus("error"); }
  }, [save]);

  const schedule = useCallback((payload: { title: string; body: string }) => {
    queue.current = payload;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void run(); }, delay);
  }, [run, delay]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { status, schedule };
}

function SaveState({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <span className={cn("text-[10.5px]", status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Couldn't save"}
    </span>
  );
}

/**
 * Moon insight for the day, with a dropdown holding today's journal entry,
 * today's daily note, and the editable daily-note template.
 */
export function PlannerMoonInsight({ date, className, onSelectDate }: { date: Date; className?: string; onSelectDate?: (d: Date) => void }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addJournal, updateJournal } = useStore();
  const { periods, settings } = useCycle();

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const toggle = (o: boolean) => {
    setOpen(o);
    try { localStorage.setItem(OPEN_KEY, o ? "1" : "0"); } catch { /* noop */ }
  };

  const phase = getMoonPhase(date);
  const moon = MOON_INFO[phase];
  const illum = getIllumination(date);
  const toFull = daysUntilFull(date);
  const toNew = daysUntilNew(date);

  const cosmic = useMemo(() => getMoonJournalContext(date), [date]);
  const theme = elementTheme(cosmic.sign.element);
  const tip = useMemo(() => moonPlanningTip(date), [date]);

  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);
  const cycleLabel = cycle ? `${PHASE_META[cycle.phase]?.label ?? cycle.label} · day ${cycle.cycleDay}` : "";
  const cycleDot = useCycleDot(date);

  // ---- Journal ----
  const entry = useMemo(
    () => state.journal.find(j => j.date === iso && (j.type === "daily" || !j.type)) ?? null,
    [state.journal, iso],
  );
  const entryIdRef = useRef<string | null>(entry?.id ?? null);
  const [jTitle, setJTitle] = useState(entry?.title ?? "");
  const [jBody, setJBody] = useState(entry?.body ?? "");
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    if (entry) {
      entryIdRef.current = entry.id;
      setJTitle(entry.title ?? "");
      setJBody(entry.body ?? "");
      hydrated.current = true;
    }
  }, [entry]);
  useEffect(() => { hydrated.current = false; entryIdRef.current = null; setJTitle(""); setJBody(""); }, [iso]);

  const creating = useRef(false);
  const journalSave = useDebouncedSave(useCallback(async ({ title, body }) => {
    if (!body.trim() && !title.trim()) return;
    if (entryIdRef.current) {
      await updateJournal(entryIdRef.current, { title: title || undefined, body });
      return;
    }
    if (creating.current) return;
    creating.current = true;
    try {
      const created = await addJournal({
        date: iso,
        type: "daily",
        title: title || undefined,
        body,
        template: "daily",
        tags: ["planner", phase],
      } as any);
      if (created) entryIdRef.current = created.id;
    } finally { creating.current = false; }
  }, [addJournal, updateJournal, iso, phase]));

  // ---- Daily note ----
  const [note, setNote] = useState<Note | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingNote(true);
    getDailyNote(iso)
      .then(n => { if (cancelled) return; setNote(n); setNoteBody(n?.body ?? ""); })
      .catch(() => { if (!cancelled) setNote(null); })
      .finally(() => { if (!cancelled) setLoadingNote(false); });
    return () => { cancelled = true; };
  }, [iso]);

  const noteSave = useDebouncedSave(useCallback(async ({ body }) => {
    if (!note) return;
    await updateNote(note.id, { body });
  }, [note]));

  const [template, saveTemplate, resetTemplate] = useDailyNoteTemplate();
  const [tplDraft, setTplDraft] = useState(template);
  useEffect(() => { setTplDraft(template); }, [template]);

  // ---- Export ----
  const allocation = useTimeAllocation(date, 1, "kind");
  const [exporting, setExporting] = useState(false);

  /** Set the journal body and queue an autosave. */
  const applyBody = (next: string) => {
    setJBody(next);
    journalSave.schedule({ title: jTitle, body: next });
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { blob, filename } = buildMoonInsightPdf({
        date,
        moonLabel: moon.label,
        illumination: illum,
        invitation: moon.invitation,
        planningTip: tip.text,
        cycleLabel: cycleLabel || undefined,
        journalTitle: jTitle || undefined,
        journalBody: jBody,
        noteTitle: note?.title || undefined,
        noteBody: noteBody,
        slices: allocation.slices,
        totalPlannedMin: allocation.totalPlannedMin,
        totalDoneMin: allocation.totalDoneMin,
      });
      const how = await shareOrDownloadPdf(blob, filename);
      toast.success(how === "shared" ? "Shared your moon insight" : "Moon insight PDF saved");
    } catch {
      toast.error("Couldn't build the PDF");
    } finally { setExporting(false); }
  };

  const createTodayNote = async () => {
    setCreatingNote(true);
    try {
      const body = renderDailyNoteTemplate(iso, template, { cycle: cycleLabel });
      const created = await createNote({
        title: format(parseISO(iso), "EEEE, MMMM d, yyyy"),
        body,
        kind: "daily",
        date: iso,
      });
      setNote(created);
      setNoteBody(created.body);
      toast.success("Daily note created");
    } catch {
      toast.error("Couldn't create today's note");
    } finally { setCreatingNote(false); }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={toggle}
      className={cn("rounded-2xl border bg-card/70", className)}
      style={{ borderColor: theme.border, backgroundImage: theme.gradient }}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-card"
          aria-label={`Moon insight — ${moon.label}. ${open ? "Collapse" : "Expand"} today's journal and note.`}
        >
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none"
            style={{ background: theme.soft, boxShadow: `inset 0 0 0 1px ${theme.border}` }}
          >
            {moon.glyph}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-display text-sm font-semibold">{moon.label}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{illum}% lit</span>
              <span className="text-[11px] text-muted-foreground">
                {toFull === 0 ? "full today" : toNew === 0 ? "new today" : toFull <= toNew ? `full in ${toFull}d` : `new in ${toNew}d`}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{moon.invitation}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <span
                className="rounded-full border px-1.5 py-0.5 font-medium"
                style={{ background: theme.soft, borderColor: theme.border, color: theme.color }}
              >
                {cosmic.sign.symbol} Moon in {cosmic.sign.name}
              </span>
              <span
                className="rounded-full border px-1.5 py-0.5 font-medium"
                style={{ background: theme.soft, borderColor: theme.border, color: theme.color }}
              >
                {cosmic.elementEmoji} {cosmic.sign.element}
              </span>
              <span
                className="rounded-full border px-1.5 py-0.5"
                style={{ borderColor: theme.border }}
              >
                {cosmic.themeName}
              </span>
              {cycleDot && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5"
                  style={{ background: cycleDot.soft, color: cycleDot.color, borderColor: cycleDot.soft }}
                >
                  <span aria-hidden>{cycleDot.glyph}</span>{cycleDot.text}
                </span>
              )}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-t p-3" style={{ borderColor: theme.border }}>
          <PlannerWeatherStrip element={cosmic.sign.element} className="mb-2" />
          <div className="mb-2 flex items-center justify-between gap-2">
            <PhaseHabitNudge date={date} className="flex-1" />
            <Button
              size="icon" variant="outline" className="h-7 w-7 shrink-0 rounded-full"
              disabled={exporting} onClick={() => void exportPdf()}
              title="Export PDF" aria-label="Export PDF"
            >
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Share2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Tabs defaultValue="journal">
            <TabsList className="h-8">
              <TabsTrigger value="journal" className="h-6 text-[11.5px]">Journal</TabsTrigger>
              <TabsTrigger value="note" className="h-6 text-[11.5px]">Daily note</TabsTrigger>
              <TabsTrigger value="template" className="h-6 text-[11.5px]">Template</TabsTrigger>
              <TabsTrigger value="history" className="h-6 text-[11.5px]">History</TabsTrigger>
            </TabsList>

            {/* Journal */}
            <TabsContent value="journal" className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {entryIdRef.current ? "Today's entry" : "Start today's entry"} · {moon.affirmation}
                </p>
                <div className="flex items-center gap-2">
                  <SaveState status={journalSave.status} />
                  <Button asChild size="sm" variant="ghost" className="h-7 rounded-full text-[11px]">
                    <Link to="/cosmic-flow"><Stars className="mr-1 h-3 w-3" />Cosmic</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="h-7 rounded-full text-[11px]">
                    <Link to="/journal"><ExternalLink className="mr-1 h-3 w-3" />Open</Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/30 p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">{cosmic.elementLine}</p>
                  <Button
                    size="sm" variant="outline" className="h-6 shrink-0 rounded-full text-[10.5px]"
                    onClick={() => applyBody(jBody.trim() ? `${jBody.trim()}\n\n${cosmic.seedBody}` : cosmic.seedBody)}
                  >
                    <Wand2 className="mr-1 h-3 w-3" />Fill prompts
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cosmic.prompts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      title={p.text}
                      className="rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10.5px] transition-colors hover:bg-accent"
                      onClick={() => applyBody(jBody.trim() ? `${jBody.trim()}\n\n${p.text}\n` : `${p.text}\n`)}
                    >
                      {p.label}
                    </button>
                  ))}
                  <span className="text-[10.5px] text-muted-foreground">{cosmic.keywords.join(" · ")}</span>
                </div>
              </div>
              <Input
                value={jTitle}
                placeholder="Title (optional)"
                className="h-8 text-sm"
                onChange={(e) => { setJTitle(e.target.value); journalSave.schedule({ title: e.target.value, body: jBody }); }}
              />
              <Textarea
                value={jBody}
                placeholder={moon.invitation}
                className="min-h-[120px] text-sm"
                onChange={(e) => { setJBody(e.target.value); journalSave.schedule({ title: jTitle, body: e.target.value }); }}
              />
            </TabsContent>

            {/* Daily note */}
            <TabsContent value="note" className="mt-3 space-y-2">
              {loadingNote ? (
                <div className="flex items-center gap-2 py-6 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading today's note…
                </div>
              ) : !note ? (
                <div className="space-y-2 py-3 text-center">
                  <p className="text-[12px] text-muted-foreground">No daily note for {format(date, "MMM d")} yet.</p>
                  <Button size="sm" className="h-8 rounded-full" disabled={creatingNote} onClick={() => void createTodayNote()}>
                    <NotebookPen className="mr-1.5 h-3.5 w-3.5" />
                    {creatingNote ? "Creating…" : "Create today's note"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[11px] text-muted-foreground">{note.title || "Daily note"}</p>
                    <div className="flex items-center gap-2">
                      <SaveState status={noteSave.status} />
                      <Button asChild size="sm" variant="ghost" className="h-7 rounded-full text-[11px]">
                        <Link to={`/notes/${note.id}`}><ExternalLink className="mr-1 h-3 w-3" />Open note</Link>
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={noteBody}
                    className="min-h-[180px] font-mono text-[12px]"
                    onChange={(e) => { setNoteBody(e.target.value); noteSave.schedule({ title: "", body: e.target.value }); }}
                  />
                </>
              )}
            </TabsContent>

            {/* Template */}
            <TabsContent value="template" className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Used whenever a daily note is created. Placeholders: {DAILY_NOTE_PLACEHOLDERS.join(" ")}
              </p>
              <Textarea
                value={tplDraft}
                className="min-h-[180px] font-mono text-[12px]"
                onChange={(e) => setTplDraft(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-7 rounded-full text-[11px]" onClick={() => { saveTemplate(tplDraft); toast.success("Template saved"); }}>
                  <Save className="mr-1 h-3 w-3" />Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => { resetTemplate(); toast.info("Template reset"); }}>
                  <RotateCcw className="mr-1 h-3 w-3" />Reset to default
                </Button>
              </div>
              <details className="rounded-xl border border-border/50 bg-muted/30 p-2">
                <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3" />Preview for today
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                  {renderDailyNoteTemplate(iso, tplDraft, { cycle: cycleLabel })}
                </pre>
              </details>
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="mt-3">
              <MoonInsightHistory date={date} onSelectDate={onSelectDate} />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
