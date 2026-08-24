import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { DashCard } from "@/components/today/dashboard/DashCard";
import { getMoonJournalContext } from "@/lib/planner/moon-journal-prompt";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

/** Today's journal: a moon-aware prompt and a one-line way in. */
export function JournalCard({ date }: { date: Date }) {
  const { state, addJournal, updateJournal } = useStore();
  const navigate = useNavigate();
  const iso = format(date, "yyyy-MM-dd");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const ctx = useMemo(() => getMoonJournalContext(date), [date]);
  const entry = useMemo(
    () => state.journal.find(j => j.date === iso && j.type === "daily"),
    [state.journal, iso],
  );

  const save = async () => {
    const line = draft.trim();
    if (!line || saving) return;
    setSaving(true);
    try {
      if (entry) await updateJournal(entry.id, { body: `${entry.body}\n\n${line}`.trim() });
      else await addJournal({ date: iso, type: "daily", body: line, prompts: ctx.prompts.map(p => p.text) });
      setDraft("");
      toast.success("Added to today's journal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashCard
      eyebrow="Grow"
      title="Journal"
      action={
        <button
          type="button"
          onClick={() => navigate("/journal")}
          className="inline-flex items-center text-[11px] text-muted-foreground hover:text-foreground"
        >
          Open <ChevronRight className="h-3 w-3" aria-hidden />
        </button>
      }
    >
      <div className="space-y-2.5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {ctx.glyph} {ctx.phaseLabel} · {ctx.sign.symbol} {ctx.sign.name}
        </p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{ctx.prompts[0]?.text}</p>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save();
          }}
          rows={2}
          placeholder="Write a line…"
          aria-label="Write a line in today's journal"
          className="w-full resize-none rounded-2xl border border-border/50 bg-background/50 px-3 py-2 text-[12.5px] outline-none focus:border-primary/50"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {entry ? "Adds to today's entry" : "Starts today's entry"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!draft.trim() || saving}
            className="min-h-[32px] rounded-full bg-primary/10 px-3 text-[11.5px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </DashCard>
  );
}
