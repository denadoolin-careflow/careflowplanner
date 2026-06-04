import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Sparkles, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { listMemories, createMemory, updateMemory, type Memory } from "@/lib/memories";

/** Today's memory entries + quick capture. */
export function MemoriesTodayWidget() {
  const iso = format(new Date(), "yyyy-MM-dd");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");

  const refresh = async () => {
    try {
      const all = await listMemories();
      setMemories(all.filter(m => m.date === iso).slice(0, 3));
    } catch { /* noop */ }
  };
  useEffect(() => { void refresh(); }, [iso]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    try {
      await createMemory({ title, date: iso, memoryType: "highlight" });
      setDraft("");
      await refresh();
    } catch { /* noop */ }
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Memories today</h3>
        </div>
        <Link to="/memories" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
          All <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      {memories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/50 px-2 py-3 text-center text-xs text-muted-foreground">
          Mark a moment from today.
        </p>
      ) : (
        <ul className="space-y-1">
          {memories.map(m => (
            <li key={m.id} className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-muted/40">
              <input
                defaultValue={m.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== m.title) void updateMemory(m.id, { title: v }).then(refresh);
                }}
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
              />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-border/60 bg-background/50 px-2 py-1">
        <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="A moment to remember…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
      </form>
    </section>
  );
}