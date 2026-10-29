import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookHeart, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LUNAR_RHYTHM, PHASE_GUIDE, lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { moonEventsOnDay, moonSignOn } from "@/lib/cosmic/moon-aspects";
import { getOrCreateDailyNote, updateNote } from "@/lib/notes";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";
import { PhaseIcon } from "@/lib/phase-icons";

const draftKey = (d: string) => `careflow:cosmic-checkin-draft:${d}`;
const PRIORITY = ["conjunction", "opposition", "square", "trine", "sextile"];

/** Let go tab: check in with today's Moon and journal straight into the Daily Note. */
export function LunarCheckInCard({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const noon = useMemo(() => { const n = new Date(date); n.setHours(12, 0, 0, 0); return n; }, [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const phase = lunarRhythmAt(noon);
  const sign = useMemo(() => moonSignOn(date), [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const events = useMemo(() => moonEventsOnDay(date), [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = useMemo(() => [...events].filter(e => e.aspect).sort((a, b) => PRIORITY.indexOf(a.aspect!) - PRIORITY.indexOf(b.aspect!))[0], [events]);
  const prompt = key
    ? `The Moon ${key.label.replace(/^Moon\s*/i, "")} — ${key.advice} What is this asking you to soften or set down?`
    : `With the Moon in ${sign}, what are you ready to set down today?`;

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setText(localStorage.getItem(draftKey(iso)) ?? ""); setSaved(false); }, [iso]);
  const onChange = (v: string) => { setText(v); setSaved(false); localStorage.setItem(draftKey(iso), v); };

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const note = await getOrCreateDailyNote(iso);
      const block = `## Cosmic check-in · ${format(new Date(), "h:mm a")}\n*${LUNAR_RHYTHM[phase].label} · Moon in ${sign}*\n\n> ${prompt}\n\n${text.trim()}`;
      await updateNote(note.id, { body: `${(note.body ?? "").replace(/\s+$/, "")}\n\n${block}\n` });
      notifyDailyNotesChanged();
      localStorage.removeItem(draftKey(iso));
      setText(""); setSaved(true);
      toast.success("Saved to your Daily Note");
    } catch { toast.error("Couldn't save to your Daily Note"); }
    finally { setSaving(false); }
  };

  return (
    <section aria-label="Check in with the cosmic flow" className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <header className="flex items-start gap-3">
        <PhaseIcon phase={phase} />
        <div className="min-w-0">
          <h2 className="font-display text-lg text-foreground">Check in with the cosmic flow</h2>
          <p className="text-sm text-muted-foreground">{LUNAR_RHYTHM[phase].label} · {LUNAR_RHYTHM[phase].glyph} Moon in {sign}</p>
        </div>
      </header>
      <p className="text-sm text-foreground">{PHASE_GUIDE[phase].focus}</p>
      {events.length > 0 && (
        <ul className="space-y-1.5 text-sm" aria-label="Today's Moon transits">
          {events.map(e => (
            <li key={e.id} className="flex gap-2">
              <span className="w-16 shrink-0 tabular-nums text-muted-foreground">{format(e.time, "h:mm a")}</span>
              <span className="min-w-0 break-words text-foreground">{e.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-xl bg-muted/50 p-3 text-sm italic text-foreground">{prompt}</div>
      <label htmlFor={`checkin-${iso}`} className="sr-only">Write your reflection</label>
      <Textarea
        id={`checkin-${iso}`}
        value={text}
        onChange={e => onChange(e.target.value)}
        placeholder="Write anything you're noticing or ready to release…"
        className="min-h-24 resize-none text-base [field-sizing:content]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={!text.trim() || saving} className="min-h-11">
          {saved ? <><Check className="mr-1 h-4 w-4" />Saved</> : "Save to Daily Note"}
        </Button>
        <Button asChild variant="ghost" className="min-h-11">
          <Link to={`/journal?prompt=${encodeURIComponent(prompt)}`}><BookHeart className="mr-1 h-4 w-4" />Journal this</Link>
        </Button>
      </div>
    </section>
  );
}
