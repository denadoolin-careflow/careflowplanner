/**
 * Health journal for one day — how you felt, in your own words.
 * Private and descriptive only; never diagnostic advice.
 */
import { useEffect, useState } from "react";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  JOURNAL_TAGS, deleteJournal, saveJournal, useHealthJournal,
} from "@/lib/wellflow/journal";

const SCALE = [1, 2, 3, 4, 5];

export function HealthJournalCard({
  date, className, compact,
}: { date: string; className?: string; compact?: boolean }) {
  const { entry, loading } = useHealthJournal(date);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(entry?.entry ?? "");
    setMood(entry?.mood ?? null);
    setEnergy(entry?.energy ?? null);
    setTags(entry?.tags ?? []);
  }, [entry?.id, entry?.entry, entry?.mood, entry?.energy, date]);

  const dirty =
    text !== (entry?.entry ?? "") ||
    mood !== (entry?.mood ?? null) ||
    energy !== (entry?.energy ?? null) ||
    tags.join("|") !== (entry?.tags ?? []).join("|");

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const save = async () => {
    setSaving(true);
    try {
      await saveJournal({ date, entry: text, mood, energy, tags });
      toast.success("Journal saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save that");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!entry) return;
    await deleteJournal(entry.id);
    setText(""); setMood(null); setEnergy(null); setTags([]);
    toast.success("Journal entry removed");
  };

  return (
    <section className={cn("rounded-2xl border border-border/40 bg-card/50 p-3", className)}>
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <NotebookPen className="h-4 w-4 text-primary" aria-hidden /> Health journal
        </h3>
        {entry && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive"
                  onClick={() => void remove()} aria-label="Delete journal entry">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </header>

      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={loading}
        rows={compact ? 2 : 3}
        placeholder="How did you feel today? Energy, digestion, sleep, anything you noticed…"
        aria-label="Health journal entry"
        className="text-sm"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Scale label="Mood" value={mood} onChange={setMood} />
        <Scale label="Energy" value={energy} onChange={setEnergy} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {JOURNAL_TAGS.map(t => (
          <button
            key={t} type="button" onClick={() => toggleTag(t)}
            aria-pressed={tags.includes(t)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              tags.includes(t)
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/50 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Private to you. Notes only — not medical advice.
        </p>
        <Button size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}

function Scale({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex gap-1" role="group" aria-label={label}>
        {SCALE.map(n => (
          <button
            key={n} type="button"
            aria-pressed={value === n}
            aria-label={`${label} ${n} of 5`}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "h-9 flex-1 rounded-lg border text-xs tabular-nums transition-colors",
              value === n
                ? "border-primary bg-primary/15 font-semibold"
                : "border-border/50 text-muted-foreground hover:bg-muted/40",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
