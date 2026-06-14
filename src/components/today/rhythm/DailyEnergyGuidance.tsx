import { useMemo, useState } from "react";
import { Moon, BookHeart, StickyNote, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCycle } from "@/lib/cycle-store";
import { getDailyEnergyGuidance } from "@/lib/daily-energy-guidance";
import { useStore, todayISO } from "@/lib/store";
import { createNote, getOrCreateDailyNote } from "@/lib/notes";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ELEMENT_ACCENT: Record<string, string> = {
  Fire:  "hsl(20 70% 60%)",
  Earth: "hsl(140 45% 55%)",
  Air:   "hsl(48 85% 62%)",
  Water: "hsl(210 70% 65%)",
};

interface Props { date: Date; className?: string }

export function DailyEnergyGuidance({ date, className }: Props) {
  const { periods, settings } = useCycle();
  const g = useMemo(
    () => getDailyEnergyGuidance(date, periods, settings),
    [date, periods, settings],
  );
  const accent = ELEMENT_ACCENT[g.element] ?? "hsl(140 35% 55%)";
  const navigate = useNavigate();
  const { addJournal } = useStore();
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [busy, setBusy] = useState<null | "daily" | "new" | "save">(null);

  const openDailyNote = async () => {
    try {
      setBusy("daily");
      const n = await getOrCreateDailyNote(todayISO());
      navigate(`/notes/${n.id}`);
    } catch {
      toast.error("Couldn't open today's note");
    } finally { setBusy(null); }
  };

  const newSeededNote = async () => {
    try {
      setBusy("new");
      const n = await createNote({
        title: g.headline.slice(0, 80),
        body: `> ${g.reflection}\n\n`,
      });
      navigate(`/notes/${n.id}`);
    } catch {
      toast.error("Couldn't create note");
    } finally { setBusy(null); }
  };

  const saveJournal = async () => {
    const body = journalText.trim();
    if (!body) { setJournalOpen(false); return; }
    try {
      setBusy("save");
      await addJournal({
        body: `Reflection: ${g.reflection}\n\n${body}`,
        type: "brain-dump",
        date: todayISO(),
      });
      toast.success("Saved to journal");
      setJournalText("");
      setJournalOpen(false);
    } catch {
      toast.error("Couldn't save");
    } finally { setBusy(null); }
  };

  return (
    <section
      aria-label="Daily energy guidance"
      className={cn(
        "w-full max-w-md animate-in fade-in duration-700",
        "rounded-2xl border border-border/50 bg-card/55 p-4 backdrop-blur sm:p-5",
        "shadow-soft",
        className,
      )}
      style={{ boxShadow: `inset 0 0 0 1px ${accent.replace(")", " / 0.18)")}` }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <Moon className="h-3 w-3" style={{ color: accent }} />
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Daily Energy
        </p>
      </div>

      <blockquote
        className="mt-2 text-balance text-center font-display text-[15px] italic leading-snug text-foreground/90 sm:text-base"
      >
        “{g.headline}”
      </blockquote>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.16em]">
        {g.focus.map((word, i) => (
          <span key={word} className="inline-flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground/40">•</span>}
            <span style={{ color: accent }}>{word}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 border-t border-border/40 pt-3 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Reflection
        </p>
        <p className="mt-1 font-display text-[13px] italic leading-snug text-foreground/80">
          “{g.reflection}”
        </p>
      </div>

      <p className="mt-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        Moon Day {g.moonDay}
        {g.cyclePhase ? <> · <span className="capitalize">{g.cyclePhase}</span></> : null}
        {" · "}{g.element}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => setJournalOpen(v => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80 transition hover:bg-background"
          style={{ borderColor: accent.replace(")", " / 0.35)") }}
        >
          <BookHeart className="h-3 w-3" style={{ color: accent }} />
          Journal this
        </button>
        <button
          type="button"
          onClick={openDailyNote}
          disabled={busy === "daily"}
          className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80 transition hover:bg-background disabled:opacity-50"
          style={{ borderColor: accent.replace(")", " / 0.35)") }}
        >
          {busy === "daily" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" style={{ color: accent }} />}
          Today's note
        </button>
        <button
          type="button"
          onClick={newSeededNote}
          disabled={busy === "new"}
          className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80 transition hover:bg-background disabled:opacity-50"
          style={{ borderColor: accent.replace(")", " / 0.35)") }}
        >
          {busy === "new" ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" style={{ color: accent }} />}
          New note
        </button>
      </div>

      {journalOpen && (
        <div className="mt-2 animate-in fade-in duration-300">
          <Textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="A line for today…"
            rows={3}
            autoFocus
            className="min-h-[72px] resize-none rounded-xl border-border/50 bg-background/70 text-sm"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => { setJournalOpen(false); setJournalText(""); }}
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveJournal}
              disabled={!journalText.trim() || busy === "save"}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft transition disabled:opacity-40"
            >
              {busy === "save" && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}
    </section>
  );
}