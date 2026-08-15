import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Moon, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { getMoonSign, MOON_IN_SIGN_GUIDE, SIGN_EMOJI } from "@/lib/zodiac";
import { getTransitsForDate, type Transit } from "@/lib/transits";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { eventsOnDay } from "@/lib/cosmic/events";
import { encodeEventId } from "@/lib/cosmic/event-id";
import { CosmicEventPopover, type CosmicEventInfo } from "./CosmicEventPopover";

const TONE_CLASS: Record<Transit["tone"], string> = {
  soft: "border-primary/30 bg-primary/10 text-foreground",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rest: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

/**
 * Cycle + moon/zodiac context for the day, with tappable cosmic events that
 * open a gentle check-in writing straight into today's journal.
 */
export function PlannerCosmicCard({ date, className }: { date: Date; className?: string }) {
  const iso = format(date, "yyyy-MM-dd");
  const { state, addJournal, updateJournal } = useStore();
  const { periods, settings } = useCycle();

  const phase = getMoonPhase(date);
  const moon = MOON_INFO[phase];
  const illum = getIllumination(date);
  const sign = getMoonSign(date);
  const guide = MOON_IN_SIGN_GUIDE[sign.name];
  const transits = useMemo(() => getTransitsForDate(date), [date]);
  const dayEvents = useMemo(() => eventsOnDay(date), [date]);

  /** Deep-link id for a transit chip, mapped onto the Cosmic Flow event scheme. */
  const transitEventId = (t: Transit) => encodeEventId({
    kind: t.kind === "voc" ? "voc" : t.kind === "ingress" ? "ingress" : "retrograde",
    date: iso,
    planet: t.planet,
    sign: t.sign,
  });

  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const [active, setActive] = useState<Transit | "moon" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const entry = useMemo(
    () => state.journal.find(j => j.date === iso && (j.type === "daily" || !j.type)) ?? null,
    [state.journal, iso],
  );

  const openCheckIn = (t: Transit | "moon") => {
    setActive(t);
    setDraft("");
  };

  const title = active === "moon" ? `${moon.label} in ${sign.name}` : active?.label ?? "";
  const detail = active === "moon" ? guide.vibe : active?.detail ?? "";
  const prompt = active === "moon"
    ? `What does "${guide.vibe.toLowerCase()}" ask of you today?`
    : "How does this land for you today?";

  const saveReflection = async () => {
    if (!draft.trim()) { toast.info("Nothing to save yet"); return; }
    setSaving(true);
    try {
      const stamp = `\n\n**${title}** — ${draft.trim()}`;
      if (entry) {
        await updateJournal(entry.id, { body: `${entry.body ?? ""}${stamp}`.trim() });
      } else {
        await addJournal({
          date: iso,
          type: "daily",
          title: "Cosmic check-in",
          body: stamp.trim(),
          template: "daily",
          tags: ["planner", "cosmic", phase],
        } as any);
      }
      toast.success("Added to today's journal");
      setActive(null);
      setDraft("");
    } catch {
      toast.error("Couldn't save that reflection");
    } finally { setSaving(false); }
  };

  return (
    <section
      className={cn("rounded-2xl border border-border/50 bg-card/70 px-3 py-2.5", className)}
      aria-label="Cosmic context for the day"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden className="text-lg leading-none">{moon.glyph}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold [overflow-wrap:anywhere]">
            {moon.label} in {sign.name} <span aria-hidden>{SIGN_EMOJI[sign.name]}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {illum}% lit · {sign.element} energy
            {cycle ? ` · ${PHASE_META[cycle.phase]?.label ?? cycle.label}, day ${cycle.cycleDay}` : ""}
          </p>
        </div>
        <Button
          size="sm" variant="ghost" className="h-7 rounded-full text-[11px]"
          onClick={() => openCheckIn("moon")}
        >
          <PenLine className="mr-1 h-3 w-3" />Check in
        </Button>
      </div>

      <p className="mt-1.5 text-[11.5px] italic text-muted-foreground [overflow-wrap:anywhere]">{guide.vibe}</p>

      {transits.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {transits.map(t => (
            <li key={t.id}>
              <CosmicEventPopover
                event={{
                  id: transitEventId(t),
                  glyph: t.glyph,
                  title: t.label,
                  when: format(date, "EEEE, MMM d"),
                  detail: t.detail,
                  landing: guide.vibe,
                } satisfies CosmicEventInfo}
                onJournal={() => openCheckIn(t)}
              >
                <button
                  type="button"
                  aria-label={`${t.label} — quick info`}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] transition hover:brightness-105",
                    TONE_CLASS[t.tone],
                  )}
                >
                  <span aria-hidden className="mr-1">{t.glyph}</span>{t.label}
                </button>
              </CosmicEventPopover>
            </li>
          ))}
        </ul>
      )}

      {dayEvents.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cosmic events today</p>
          <ul className="flex flex-wrap gap-1.5">
            {dayEvents.map(ev => (
              <li key={ev.id}>
                <CosmicEventPopover
                  event={{
                    id: ev.id,
                    glyph: ev.glyph,
                    title: ev.title,
                    when: format(date, "EEEE, MMM d"),
                    detail: ev.subtitle ?? "A shift in the sky worth noticing.",
                    landing: guide.vibe,
                    actions: guide.actions,
                  } satisfies CosmicEventInfo}
                  onJournal={() => openCheckIn("moon")}
                >
                  <button
                    type="button"
                    aria-label={`${ev.title} — quick info`}
                    className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] transition hover:brightness-105"
                  >
                    <span aria-hidden className="mr-1">{ev.glyph}</span>
                    <span className="[overflow-wrap:anywhere]">{ev.title}</span>
                  </button>
                </CosmicEventPopover>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2 font-display text-base">
              <Moon className="h-4 w-4 text-primary" />{title}
            </SheetTitle>
            <SheetDescription className="text-[12.5px]">{detail}</SheetDescription>
          </SheetHeader>

          {active === "moon" && (
            <ul className="mt-3 space-y-1">
              {guide.actions.map(a => (
                <li key={a} className="flex items-start gap-2 rounded-xl bg-muted/50 px-2.5 py-1.5 text-[12px] text-muted-foreground">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 space-y-2 pb-4">
            <label htmlFor="cosmic-reflection" className="text-[11.5px] text-muted-foreground">{prompt}</label>
            <Textarea
              id="cosmic-reflection"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="A sentence is plenty."
              className="min-h-[110px] text-sm"
            />
            <Button className="w-full rounded-full" disabled={saving} onClick={() => void saveReflection()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PenLine className="mr-1.5 h-3.5 w-3.5" />}
              Add to today's journal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
