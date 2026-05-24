import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { listNotes, type Note } from "@/lib/notes";
import { TagChip } from "@/components/tags/TagChip";
import { format, parseISO } from "date-fns";

export default function TagDetail() {
  const { name = "" } = useParams();
  const tagName = decodeURIComponent(name);
  const { state } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => { void listNotes().then(setNotes).catch(() => {}); }, []);

  const lc = tagName.toLowerCase();

  const tasks = useMemo(
    () => (state.tasks ?? []).filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc)),
    [state.tasks, lc],
  );
  const ideas = tasks.filter(t => (t.tags ?? []).some(n => n.toLowerCase() === "idea"));
  const regular = tasks.filter(t => !(t.tags ?? []).some(n => n.toLowerCase() === "idea"));
  const taggedNotes = useMemo(
    () => notes.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc)),
    [notes, lc],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/tags"><ArrowLeft className="h-4 w-4" /> Tags</Link>
        </Button>
        <TagChip name={tagName} size="md" />
        <span className="text-sm text-muted-foreground">
          {regular.length + ideas.length} task{tasks.length === 1 ? "" : "s"} · {taggedNotes.length} note{taggedNotes.length === 1 ? "" : "s"}
        </span>
      </header>

      <Group title="Tasks" icon={CheckCircle2} items={regular.map(t => ({
        key: t.id, title: t.title, to: `/anytime?taskId=${t.id}`, meta: t.dueDate ? format(parseISO(t.dueDate), "MMM d") : undefined,
      }))} />
      <Group title="Ideas" icon={Lightbulb} items={ideas.map(t => ({
        key: t.id, title: t.title, to: `/ideas`, meta: undefined,
      }))} />
      <Group title="Notes" icon={FileText} items={taggedNotes.map(n => ({
        key: n.id,
        title: n.kind === "daily" && n.date ? format(parseISO(n.date), "EEEE, MMM d") : (n.title || "Untitled"),
        to: `/notes/${n.id}`,
        meta: format(parseISO(n.updatedAt), "MMM d"),
      }))} />
    </div>
  );
}

function Group({ title, icon: Icon, items }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { key: string; title: string; to: string; meta?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
        <span className="text-muted-foreground/60">· {items.length}</span>
      </h2>
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
        {items.map(it => (
          <Link key={it.key} to={it.to} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <span className="flex-1 truncate text-sm">{it.title}</span>
            {it.meta && <span className="text-[11px] text-muted-foreground">{it.meta}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}