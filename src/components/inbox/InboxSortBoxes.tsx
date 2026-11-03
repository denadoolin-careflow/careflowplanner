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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SortBox = "today" | "week" | "someday" | "notes";

export const SORT_BOXES: { id: SortBox; label: string; icon: typeof Sun; phase: "plan" | "grow" | "care" | "letgo" }[] = [
  { id: "today", label: "Today", icon: Sun, phase: "grow" },
  { id: "week", label: "This week", icon: CalendarRange, phase: "plan" },
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
  const { state } = useStore() as any;
  const sort = useSortToBox();
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
    const open = (state.tasks ?? []).filter((t: any) => !t.done && !t.inbox && !t.parentTaskId);
    return {
      today: open.filter((t: any) => t.dueDate === today).map((t: any) => ({ id: t.id, title: t.title })),
      week: open.filter((t: any) => t.status === "this_week").map((t: any) => ({ id: t.id, title: t.title })),
      someday: open.filter((t: any) => t.status === "someday").map((t: any) => ({ id: t.id, title: t.title })),
      notes: notes.map((n) => ({ id: n.id, title: n.title })),
    } as Record<SortBox, { id: string; title: string }[]>;
  }, [state.tasks, notes, today]);

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
            <span className="rounded-full bg-background/70 px-2 text-xs font-semibold tabular-nums">{boxes[b.id].length}</span>
          </button>
        ))}
      </div>

      {openBox && (
        <div className="planner-card bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{SORT_BOXES.find((b) => b.id === openBox)!.label}</p>
            <button type="button" aria-label="Close" onClick={() => setOpenBox(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted/60"><X className="h-4 w-4" /></button>
          </div>
          {boxes[openBox].length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="space-y-1">
              {boxes[openBox].slice(0, 12).map((x) => (
                <li key={x.id} className="break-words text-sm">
                  {openBox === "notes" ? <Link className="hover:underline" to={`/notes/${x.id}`}>{x.title}</Link> : x.title}
                </li>
              ))}
              {boxes[openBox].length > 12 && <li className="text-xs text-muted-foreground">+{boxes[openBox].length - 12} more</li>}
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
