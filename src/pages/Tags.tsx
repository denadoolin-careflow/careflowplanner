import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useTags } from "@/hooks/use-tags";
import { listNotes, type Note } from "@/lib/notes";
import { useEffect } from "react";
import { TagChip } from "@/components/tags/TagChip";
import { TagManagerDialog } from "@/components/tags/TagManagerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings2, Tags as TagsIcon } from "lucide-react";

export default function Tags() {
  const { tags, loading } = useTags();
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => { void listNotes().then(setNotes).catch(() => {}); }, []);

  // Count entries per tag (case-insensitive)
  const counts = useMemo(() => {
    const m = new Map<string, { tasks: number; notes: number }>();
    const bump = (name: string, key: "tasks" | "notes") => {
      const k = name.toLowerCase();
      const c = m.get(k) ?? { tasks: 0, notes: 0 };
      c[key]++;
      m.set(k, c);
    };
    (state.tasks ?? []).forEach(t => (t.tags ?? []).forEach(n => bump(n, "tasks")));
    notes.forEach(n => (n.tags ?? []).forEach(name => bump(name, "notes")));
    return m;
  }, [state.tasks, notes]);

  // Build full list: registered tags + any orphan tag names found on data.
  const all = useMemo(() => {
    const seen = new Set(tags.map(t => t.name.toLowerCase()));
    const orphans: string[] = [];
    counts.forEach((_v, k) => { if (!seen.has(k)) orphans.push(k); });
    return [
      ...tags.map(t => ({ name: t.name })),
      ...orphans.map(n => ({ name: n })),
    ];
  }, [tags, counts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(t => t.name.toLowerCase().includes(term));
  }, [all, q]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <TagsIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-sm text-muted-foreground">Cross-cut your tasks, notes, and ideas with color-coded tags.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)} className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Manage
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tags…" className="pl-9" />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No tags yet. Add tags to a task or note to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => {
            const c = counts.get(t.name.toLowerCase()) ?? { tasks: 0, notes: 0 };
            return (
              <Link
                key={t.name}
                to={`/tags/${encodeURIComponent(t.name)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-3 py-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <TagChip name={t.name} size="md" />
                <span className="text-xs text-muted-foreground">
                  {c.tasks} task{c.tasks === 1 ? "" : "s"} · {c.notes} note{c.notes === 1 ? "" : "s"}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <TagManagerDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}