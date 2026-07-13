import { useEffect, useState } from "react";
import { format } from "date-fns";
import { getIntention, setIntention } from "@/lib/daily-intention";
import { Heart, Check, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function TodayIntentionCard({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const [val, setVal] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => { setVal(getIntention(iso)); }, [iso]);

  const save = () => { setIntention(iso, val); setEditing(false); };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <header className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Heart className="h-3 w-3" />Today's Intention
        </span>
        <button onClick={() => setEditing(v => !v)} className="text-[10px] text-primary hover:underline">
          {editing ? <Check className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
        </button>
      </header>
      {editing ? (
        <Input
          autoFocus
          value={val}
          onChange={(e) => { setVal(e.target.value); setIntention(iso, e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") setEditing(false); }}
          onBlur={save}
          placeholder="One line for today…"
          className="h-8 text-xs"
        />
      ) : (
        <p onClick={() => setEditing(true)}
          className="min-h-[24px] cursor-text text-[13px] italic text-foreground/80">
          {val || <span className="not-italic text-muted-foreground">One line for today…</span>}
        </p>
      )}
    </section>
  );
}