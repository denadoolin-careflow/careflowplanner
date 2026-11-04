import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Sun, CalendarRange, Cloud, NotebookPen, ArrowDownUp, X, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { createNote } from "@/lib/notes";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PlannerTaskRow } from "@/components/planner/PlannerTaskRow";
import { parseTaskInput } from "@/lib/nlp-task";
import { Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SortBox = "today" | "week" | "someday" | "notes";

export const SORT_BOXES: { id: SortBox; label: string; icon: typeof Sun; phase: "plan" | "grow" | "care" | "letgo" }[] = [
  { id: "today", label: "Today", icon: Sun, phase: "plan" },
  { id: "week", label: "This week", icon: CalendarRange, phase: "grow" },
  { id: "someday", label: "Someday", icon: Cloud, phase: "care" },
  { id: "notes", label: "Notes", icon: NotebookPen, phase: "letgo" },
];

const NOTES_KEY = "careflow.inbox.sortedNotes";
type SortedNote = { id: string; title: string; date: string };
function readSortedNotes(): SortedNote[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]"); } catch { return []; }
}

/** Moves an inbox item into one of the four boxes using the existing task/note records. */
export function useSortToBox() {
  const { updateTask, deleteTask } = useStore() as any;
  return async (task: any, box: SortBox) => {
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      if (box === "today") await updateTask(task.id, { inbox: false, dueDate: today, status: "active" });
      else if (box === "week") await updateTask(task.id, { inbox: false, status: "this_week" });
      else if (box === "someday") await updateTask(task.id, { inbox: false, status: "someday" });
      else {
        const n = await createNote({ title: task.title, body: task.notes || undefined });
        await deleteTask(task.id);
        const list = [{ id: n.id, title: task.title, date: today }, ...readSortedNotes()].slice(0, 50);
        localStorage.setItem(NOTES_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event("careflow:inbox-sorted-notes"));
      }
      haptics.snap?.();
      toast(`Moved to ${SORT_BOXES.find((b) => b.id === box)!.label}`);
    } catch {
      toast.error("Couldn't sort that item");
    }
  };
}

function tint(phase: string) {
  return { background: `hsl(var(--rhythm-${phase}-tint))`, color: `hsl(var(--rhythm-${phase}-deep))` };
}

/** One Sort button per inbox item. */
export function InboxSortButton({ task }: { task: any }) {
  const sort = useSortToBox();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Sort ${task.title}`} className="h-10 gap-1.5 text-xs text-muted-foreground">
          <ArrowDownUp className="h-3.5 w-3.5" /> Sort
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="grid gap-1">
          {SORT_BOXES.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => { setOpen(false); void sort(task, b.id); }}
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm hover:bg-muted/60"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full" style={tint(b.phase)}><b.icon className="h-4 w-4" /></span>
              {b.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Four box tiles plus the "Sort one at a time" focused card. */
export function InboxSortBoxes({ items }: { items: any[] }) {
  const { state, addTask } = useStore() as any;
  const sort = useSortToBox();
  const [lingering, setLingering] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [openBox, setOpenBox] = useState<SortBox | null>(null);
  const [focus, setFocus] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [sortedInRun, setSortedInRun] = useState(0);
  const [notes, setNotes] = useState<SortedNote[]>(readSortedNotes);
  const [runTotal, setRunTotal] = useState(0);

  useEffect(() => {
    const on = () => setNotes(readSortedNotes());
    window.addEventListener("careflow:inbox-sorted-notes", on);
    return () => window.removeEventListener("careflow:inbox-sorted-notes", on);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const boxes = useMemo(() => {
    const all = (state.tasks ?? []).filter((t: any) => !t.inbox && !t.parentTaskId);
    const pick = (fn: (t: any) => boolean) => ({
      open: all.filter((t: any) => !t.done && fn(t)),
      shown: all.filter((t: any) => (!t.done || lingering.includes(t.id)) && fn(t)),
    });
    return {
      today: pick((t) => t.dueDate === today),
      week: pick((t) => t.status === "this_week" && t.dueDate !== today),
      someday: pick((t) => t.status === "someday"),
      notes: { open: notes, shown: notes },
    } as Record<SortBox, { open: any[]; shown: any[] }>;
  }, [state.tasks, notes, today, lingering]);

  // Keep just-checked tasks visible briefly (with strikethrough) before they drop off.
  const prevDone = useMemo(() => new Map<string, boolean>(), []);
  useEffect(() => {
    const newly: string[] = [];
    for (const t of state.tasks ?? []) {
      const was = prevDone.get(t.id);
      if (was === false && t.done) newly.push(t.id);
      prevDone.set(t.id, !!t.done);
    }
    if (!newly.length) return;
    setLingering((l) => [...l, ...newly]);
    const h = setTimeout(() => setLingering((l) => l.filter((x) => !newly.includes(x))), 1800);
    return () => clearTimeout(h);
  }, [state.tasks, prevDone]);

  const addToBox = async () => {
    const raw = draft.trim();
    if (!raw || !openBox || openBox === "notes") return;
    const p = parseTaskInput(raw);
    const base: any = { title: p.title || raw, inbox: false, priority: p.priority, area: p.area, tags: p.tags, estMinutes: p.estMinutes, time: p.time };
    if (openBox === "today") Object.assign(base, { dueDate: p.dueDate ?? today, status: "active" });
    else if (openBox === "week") Object.assign(base, { dueDate: p.dueDate, status: "this_week" });
    else Object.assign(base, { dueDate: p.dueDate, status: "someday" });
    Object.keys(base).forEach((k) => base[k] === undefined && delete base[k]);
    try { await addTask(base); setDraft(""); haptics.snap?.(); } catch { toast.error("Couldn't add that"); }
  };

  const queue = useMemo(
    () => [...items].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))).filter((t) => !skipped.includes(t.id)),
    [items, skipped],
  );
  const current = queue[0];

  const startFocus = () => { setSkipped([]); setSortedInRun(0); setRunTotal(items.length); setFocus(true); };

  return (
    <section aria-label="Sort boxes" className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SORT_BOXES.map((b) => (
          <button
            key={b.id}
            type="button"
            aria-expanded={openBox === b.id}
            onClick={() => setOpenBox(openBox === b.id ? null : b.id)}
            className={cn("flex min-h-14 items-center gap-2 rounded-2xl px-3 py-2 text-left shadow-sm transition", openBox === b.id && "ring-2 ring-current")}
            style={tint(b.phase)}
          >
            <b.icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm font-medium">{b.label}</span>
            <span className="rounded-full bg-background/70 px-2 text-xs font-semibold tabular-nums">{boxes[b.id].open.length}</span>
          </button>
        ))}
      </div>

      {openBox && (
        <div className="planner-card bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{SORT_BOXES.find((b) => b.id === openBox)!.label}</p>
            <button type="button" aria-label="Close" onClick={() => setOpenBox(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted/60"><X className="h-4 w-4" /></button>
          </div>
          {openBox !== "notes" && (
            <form onSubmit={(e) => { e.preventDefault(); void addToBox(); }} className="mb-2 flex items-center gap-2 rounded-xl bg-muted/50 px-3">
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              <label htmlFor="box-add" className="sr-only">Add to {SORT_BOXES.find((b) => b.id === openBox)!.label}</label>
              <input id="box-add" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='Add… e.g. "call mom 3pm"' className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </form>
          )}
          {boxes[openBox].shown.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing here yet.</p>
          ) : openBox === "notes" ? (
            <ul className="space-y-1.5">
              {boxes.notes.shown.slice(0, 20).map((x: any) => (
                <li key={x.id}>
                  <Link to={`/notes/${x.id}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-border/40 bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted/40">
                    <NotebookPen className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--rhythm-letgo-deep))" }} />
                    <span className="min-w-0 flex-1 break-words">{x.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-1.5">
              {boxes[openBox].shown.slice(0, 30).map((t: any) => (
                <li key={t.id}><PlannerTaskRow task={t} /></li>
              ))}
              {boxes[openBox].shown.length > 30 && <li className="text-xs text-muted-foreground">+{boxes[openBox].shown.length - 30} more</li>}
            </ul>
          )}
        </div>
      )}

      {!focus && items.length > 0 && (
        <Button variant="outline" onClick={startFocus} className="h-11 w-full rounded-full">Sort one at a time</Button>
      )}

      {focus && (
        <div className="planner-card bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {current ? `${Math.min(sortedInRun + skipped.length + 1, Math.max(runTotal, 1))} of ${Math.max(runTotal, 1)}` : "Done"}
            </p>
            <button type="button" aria-label="Close one at a time" onClick={() => setFocus(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted/60"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${runTotal ? ((sortedInRun + skipped.length) / runTotal) * 100 : 100}%` }} />
          </div>
          {current ? (
            <>
              <p className="mb-4 break-words font-display text-xl">{current.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {SORT_BOXES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { setSortedInRun((n) => n + 1); void sort(current, b.id); }}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-medium"
                    style={tint(b.phase)}
                  >
                    <b.icon className="h-4 w-4" /> {b.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setSkipped((s) => [...s, current.id])} className="mt-2 h-11 w-full gap-1.5">
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">Inbox zero, gently held.</p>
          )}
        </div>
      )}
    </section>
  );
}
