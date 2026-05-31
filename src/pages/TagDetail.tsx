import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Folder, Pin, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { listNotes, createNote, type Note } from "@/lib/notes";
import { TagChip } from "@/components/tags/TagChip";
import { useTags } from "@/hooks/use-tags";
import { fallbackColorFor } from "@/lib/tags";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TagDetail() {
  const { name = "" } = useParams();
  const tagName = decodeURIComponent(name);
  const { state, addTask, addGrocery, addProject } = useStore();
  const { resolve, byName, ensure, setPinned } = useTags();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);

  const reloadNotes = () => { void listNotes().then(setNotes).catch(() => {}); };
  useEffect(() => { reloadNotes(); }, []);

  const lc = tagName.toLowerCase();
  const meta = resolve(tagName);
  const accent = meta.color || fallbackColorFor(tagName);
  const existing = byName(tagName);
  const isPinned = !!existing?.pinned;

  const togglePin = async () => {
    try {
      const t = existing ?? await ensure(tagName);
      await setPinned(t.id, !t.pinned);
      toast.success(t.pinned ? `Unpinned #${tagName}` : `Pinned #${tagName} to sidebar`);
    } catch (e) {
      console.warn(e);
      toast.error("Could not update pin");
    }
  };

  const tasks = useMemo(
    () => (state.tasks ?? []).filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc)),
    [state.tasks, lc],
  );
  const taggedNotes = useMemo(
    () => notes.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc)),
    [notes, lc],
  );
  const groceries = useMemo(
    () => (state.grocery ?? []).filter(g => (g.tags ?? []).some(t => t.toLowerCase() === lc)),
    [state.grocery, lc],
  );
  const hashtagToken = `#${tagName.toLowerCase()}`;
  const projects = useMemo(
    () => (state.projects ?? []).filter(p => (p.notes ?? "").toLowerCase().includes(hashtagToken)),
    [state.projects, hashtagToken],
  );

  const totalCount = tasks.length + taggedNotes.length + groceries.length + projects.length;

  const addEntity = async (kind: "task" | "note" | "grocery" | "project") => {
    try {
      if (kind === "task") {
        await addTask({ title: `New ${tagName} task`, tags: [tagName] });
        toast.success(`Task added to #${tagName}`);
        navigate(`/anytime`);
      } else if (kind === "note") {
        const n = await createNote({ title: tagName, body: `#${tagName} `, tags: [tagName] });
        toast.success(`Note added to #${tagName}`);
        navigate(`/notes/${n.id}`);
      } else if (kind === "grocery") {
        await addGrocery(`#${tagName} item`);
        toast.success(`Grocery item added — tag with #${tagName} on the list`);
        navigate(`/pantry`);
      } else if (kind === "project") {
        const p = await addProject({ name: `New ${tagName} project`, notes: `#${tagName}` });
        toast.success(`Project added to #${tagName}`);
        if (p?.id) navigate(`/projects/${p.id}`);
      }
    } catch (e) {
      console.warn(e);
      toast.error("Could not add — try again");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/tags"><ArrowLeft className="h-4 w-4" /> Tags</Link>
        </Button>
        <TagChip name={tagName} size="md" />
        <span className="text-sm text-muted-foreground">
          {totalCount} item{totalCount === 1 ? "" : "s"}
        </span>
        <div className="ml-auto">
          <Button
            variant={isPinned ? "default" : "outline"}
            size="sm"
            className="mr-2 gap-1.5"
            onClick={() => void togglePin()}
            aria-pressed={isPinned}
            title={isPinned ? "Unpin from sidebar" : "Pin to sidebar"}
          >
            <Pin className={cn("h-4 w-4", isPinned && "fill-current")} />
            {isPinned ? "Pinned" : "Pin"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 rounded-full">
                <Plus className="h-4 w-4" /> Add to #{tagName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => void addEntity("task")}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void addEntity("note")}>
                <FileText className="mr-2 h-4 w-4" /> Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void addEntity("grocery")}>
                <ShoppingCart className="mr-2 h-4 w-4" /> Grocery item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void addEntity("project")}>
                <Folder className="mr-2 h-4 w-4" /> Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CardSection
        title="Tasks" icon={CheckCircle2} accent={accent}
        emptyLabel="No tasks tagged yet" emptyCta="Add task"
        onEmptyAdd={() => void addEntity("task")}
        cards={tasks.map(t => ({
          key: t.id, title: t.title,
          meta: t.dueDate ? format(parseISO(t.dueDate), "MMM d") : (t.done ? "Done" : "Anytime"),
          to: `/anytime?taskId=${t.id}`,
        }))}
      />
      <CardSection
        title="Notes" icon={FileText} accent={accent}
        emptyLabel="No notes tagged yet" emptyCta="Add note"
        onEmptyAdd={() => void addEntity("note")}
        cards={taggedNotes.map(n => ({
          key: n.id,
          title: n.kind === "daily" && n.date ? format(parseISO(n.date), "EEEE, MMM d") : (n.title || "Untitled"),
          meta: format(parseISO(n.updatedAt), "MMM d"),
          to: `/notes/${n.id}`,
        }))}
      />
      <CardSection
        title="Grocery" icon={ShoppingCart} accent={accent}
        emptyLabel="No grocery items tagged yet" emptyCta="Add item"
        onEmptyAdd={() => void addEntity("grocery")}
        cards={groceries.map(g => ({
          key: g.id, title: g.name,
          meta: g.bought ? "Bought" : (g.category ?? "On list"),
          to: `/pantry`,
        }))}
      />
      <CardSection
        title="Projects" icon={Folder} accent={accent}
        emptyLabel="No projects tagged yet" emptyCta="Add project"
        onEmptyAdd={() => void addEntity("project")}
        cards={projects.map(p => ({
          key: p.id, title: p.name,
          meta: p.status ?? "Active",
          to: `/projects/${p.id}`,
        }))}
      />
    </div>
  );
}

interface CardItem { key: string; title: string; meta?: string; to: string; }
function CardSection({
  title, icon: Icon, accent, cards, emptyLabel, emptyCta, onEmptyAdd,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  cards: CardItem[];
  emptyLabel: string;
  emptyCta: string;
  onEmptyAdd: () => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
        <span className="text-muted-foreground/60">· {cards.length}</span>
      </h2>
      {cards.length === 0 ? (
        <button
          type="button"
          onClick={onEmptyAdd}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 px-4 py-6 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-card/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> {emptyLabel} — {emptyCta}
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(c => (
            <Link
              key={c.key}
              to={c.to}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 pl-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              )}
            >
              <span
                aria-hidden
                className="absolute inset-y-2 left-1 w-1 rounded-full"
                style={{ background: accent }}
              />
              <div className="truncate text-sm font-medium">{c.title}</div>
              {c.meta && <div className="mt-0.5 text-[11px] text-muted-foreground">{c.meta}</div>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}