import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, Folder, ShoppingCart, ArrowRight } from "lucide-react";
import {
  HoverCard, HoverCardContent, HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { useTags } from "@/hooks/use-tags";
import { fallbackColorFor } from "@/lib/tags";
import { listNotes, type Note } from "@/lib/notes";
import { TagChip } from "./TagChip";
import { cn } from "@/lib/utils";

// In-memory notes cache so previews don't refetch on every hover.
let notesCache: Note[] | null = null;
let notesPromise: Promise<Note[]> | null = null;
function useTaggedNotesCache() {
  const [notes, setNotes] = useState<Note[]>(notesCache ?? []);
  useEffect(() => {
    if (notesCache) { setNotes(notesCache); return; }
    if (!notesPromise) {
      notesPromise = listNotes().then(n => { notesCache = n; return n; }).catch(() => []);
    }
    let alive = true;
    notesPromise.then(n => { if (alive) setNotes(n); });
    return () => { alive = false; };
  }, []);
  return notes;
}

/** Tiny touch-device detector to switch hover -> tap. */
function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(hover: none)") : null;
    if (!mq) return;
    const apply = () => setTouch(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return touch;
}

export function TagPreviewContent({ name, onNavigate }: { name: string; onNavigate?: () => void }) {
  const { state } = useStore();
  const { resolve } = useTags();
  const notes = useTaggedNotesCache();
  const lc = name.toLowerCase();
  const meta = resolve(name);
  const accent = meta.color || fallbackColorFor(name);

  const tasks = useMemo(
    () => (state.tasks ?? []).filter(t => (t.tags ?? []).some(n => n.toLowerCase() === lc)),
    [state.tasks, lc],
  );
  const openTasks = tasks.filter(t => !t.done).length;
  const noteCount = useMemo(
    () => notes.filter(n => (n.tags ?? []).some(t => t.toLowerCase() === lc)).length,
    [notes, lc],
  );
  const groceryCount = useMemo(
    () => (state.grocery ?? []).filter(g => (g.tags ?? []).some(t => t.toLowerCase() === lc)).length,
    [state.grocery, lc],
  );
  const projectCount = useMemo(() => {
    const token = `#${lc}`;
    return (state.projects ?? []).filter(p => (p.notes ?? "").toLowerCase().includes(token)).length;
  }, [state.projects, lc]);

  const total = tasks.length + noteCount + groceryCount + projectCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <TagChip name={name} size="md" />
        <span className="text-[11px] text-muted-foreground">
          {total} item{total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Stat icon={CheckCircle2} label="Tasks" value={tasks.length} sub={openTasks ? `${openTasks} open` : undefined} accent={accent} />
        <Stat icon={FileText} label="Notes" value={noteCount} accent={accent} />
        <Stat icon={ShoppingCart} label="Grocery" value={groceryCount} accent={accent} />
        <Stat icon={Folder} label="Projects" value={projectCount} accent={accent} />
      </div>
      <Link
        to={`/tags/${encodeURIComponent(name)}`}
        onClick={onNavigate}
        className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
      >
        Open tag <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; sub?: string; accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/70 px-2.5 py-2">
      <span aria-hidden className="absolute inset-y-1 left-0.5 w-0.5 rounded-full" style={{ background: accent }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-base font-semibold leading-none">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Wraps trigger element with hover (desktop) / tap (touch) tag preview. */
export function TagPreviewHover({
  name, children, asChild = true, className,
}: { name: string; children: ReactNode; asChild?: boolean; className?: string }) {
  const touch = useIsTouch();
  const [open, setOpen] = useState(false);

  if (touch) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild={asChild} className={className}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        >
          {children}
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-72 rounded-2xl p-3">
          <TagPreviewContent name={name} onNavigate={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild={asChild} className={className}>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 rounded-2xl p-3">
        <TagPreviewContent name={name} />
      </HoverCardContent>
    </HoverCard>
  );
}