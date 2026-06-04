import { useEffect, useRef, useState } from "react";
import { Sparkles, ArrowRight, CalendarPlus, BookHeart, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { format } from "date-fns";

const RECENT_KEY = "careflow:today:braindump:recent";
const MAX_RECENT = 5;

type RecentEntry = { title: string; converted?: "task" | "journal" };

function readRecent(): RecentEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // Migrate legacy string[] format.
    return arr.slice(0, MAX_RECENT).map((x: unknown) =>
      typeof x === "string" ? { title: x } : (x as RecentEntry),
    );
  } catch { return []; }
}

/** Quick capture: each non-empty line becomes a task in Inbox. */
export function BrainDumpWidget() {
  const { state, addTask, addJournal, updateTask, deleteTask } = useStore();
  const [value, setValue] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>(readRecent);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const writeRecent = (next: RecentEntry[]) => {
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const capture = async () => {
    const lines = value.split("\n").map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    for (const title of lines) {
      await addTask({ title, inbox: true });
    }
    const next: RecentEntry[] = [
      ...lines.reverse().map(title => ({ title })),
      ...recent,
    ].slice(0, MAX_RECENT);
    writeRecent(next);
    setValue("");
    toast.success(lines.length === 1 ? "Captured to inbox" : `Captured ${lines.length} items`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault(); void capture();
    } else if (e.key === "Escape") {
      setValue("");
    }
  };

  /** Find the most recently created open inbox task that matches this title. */
  const findInboxTaskByTitle = (title: string) => {
    const matches = state.tasks
      .filter(t => !t.done && t.status !== "parked" && t.title === title)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return matches[0] ?? null;
  };

  const convertToTask = async (idx: number) => {
    const entry = recent[idx];
    if (!entry || entry.converted) return;
    const iso = format(new Date(), "yyyy-MM-dd");
    const existing = findInboxTaskByTitle(entry.title);
    if (existing) {
      await updateTask(existing.id, { dueDate: iso, inbox: false });
    } else {
      await addTask({ title: entry.title, dueDate: iso, inbox: false });
    }
    const next = recent.slice();
    next[idx] = { ...entry, converted: "task" };
    writeRecent(next);
    toast.success(`Scheduled “${entry.title}” for today`);
  };

  const convertToJournal = async (idx: number) => {
    const entry = recent[idx];
    if (!entry || entry.converted) return;
    await addJournal({ body: entry.title });
    const existing = findInboxTaskByTitle(entry.title);
    if (existing) await deleteTask(existing.id);
    const next = recent.slice();
    next[idx] = { ...entry, converted: "journal" };
    writeRecent(next);
    toast.success("Saved to journal");
  };

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Brain dump</h3>
        </div>
        <Link
          to="/inbox"
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Inbox <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKey}
        placeholder="One thought per line… ⌘↵ to capture"
        rows={2}
        className="w-full resize-none rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {value.trim() ? `${value.split("\n").map(s => s.trim()).filter(Boolean).length} item${value.split("\n").map(s => s.trim()).filter(Boolean).length === 1 ? "" : "s"}` : "Lands in Inbox"}
        </span>
        <Button size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => void capture()} disabled={!value.trim()}>
          Capture
        </Button>
      </div>

      {recent.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border/40 pt-2">
          {recent.map((r, i) => (
            <li
              key={i}
              className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-muted/30"
            >
              <span className="min-w-0 flex-1 truncate" title={r.title}>· {r.title}</span>
              {r.converted ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                  <Check className="h-2.5 w-2.5" />
                  {r.converted === "task" ? "Today" : "Journal"}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void convertToTask(i)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    aria-label="Schedule for today"
                    title="Schedule for today"
                  >
                    <CalendarPlus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void convertToJournal(i)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    aria-label="Save to journal"
                    title="Save to journal"
                  >
                    <BookHeart className="h-3 w-3" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}