/**
 * MeisterTask-style personal "My Focus" pinboard. Pins point at existing tasks
 * (they stay in their project/area); columns and pins are device-local.
 */
import { useEffect, useMemo, useState } from "react";
import { Pin, Plus, X, Check, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { cn } from "@/lib/utils";

type Column = { id: string; title: string };
type Board = { columns: Column[]; pins: { taskId: string; columnId: string }[] };

const KEY = "careflow:focus-pinboard:v1";
const EVT = "careflow:focus-pinboard";
const DEFAULT: Board = {
  columns: [
    { id: "morning", title: "Morning focus" },
    { id: "afternoon", title: "Afternoon rhythm" },
    { id: "waiting", title: "Waiting on family" },
    { id: "later", title: "Resting / later" },
  ],
  pins: [],
};

function read(): Board {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v?.columns) return v; } catch { /* noop */ }
  return DEFAULT;
}

function useBoard() {
  const [board, setBoard] = useState<Board>(read);
  useEffect(() => {
    const h = () => setBoard(read());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  const save = (b: Board) => {
    setBoard(b);
    try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* noop */ }
    window.dispatchEvent(new Event(EVT));
  };
  return [board, save] as const;
}

const MIME = "application/x-careflow-focus-pin";

export function FocusPinboard() {
  const { state, toggleTask } = useStore() as any;
  const [board, save] = useBoard();
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const tasks: any[] = state.tasks ?? [];
  const byId = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const pinned = new Set(board.pins.map(p => p.taskId));
  const candidates = tasks
    .filter(t => !t.done && !t.parentTaskId && !pinned.has(t.id) && t.title?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const pin = (taskId: string, columnId: string) =>
    save({ ...board, pins: [...board.pins.filter(p => p.taskId !== taskId), { taskId, columnId }] });
  const unpin = (taskId: string) => save({ ...board, pins: board.pins.filter(p => p.taskId !== taskId) });
  const rename = (id: string, title: string) =>
    save({ ...board, columns: board.columns.map(c => (c.id === id ? { ...c, title: title.trim() || c.title } : c)) });
  const removeCol = (id: string) =>
    save({ columns: board.columns.filter(c => c.id !== id), pins: board.pins.filter(p => p.columnId !== id) });
  const addCol = () => {
    const id = `c-${Date.now().toString(36)}`;
    save({ ...board, columns: [...board.columns, { id, title: "New section" }] });
    setEditing(id);
  };

  return (
    <section aria-label="My focus pinboard" className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm">
      <header className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary"><Pin className="h-3.5 w-3.5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold leading-tight">My focus</h3>
          <p className="text-[11px] text-muted-foreground">Pin tasks from anywhere — they stay in their project.</p>
        </div>
        <button type="button" onClick={addCol} className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> Section
        </button>
      </header>

      <div className="grid gap-2">
        {board.columns.map(col => {
          const items = board.pins.filter(p => p.columnId === col.id && byId.has(p.taskId));
          return (
            <div
              key={col.id}
              onDragOver={e => { if (e.dataTransfer.types.includes(MIME)) { e.preventDefault(); setOverCol(col.id); } }}
              onDragLeave={() => setOverCol(c => (c === col.id ? null : c))}
              onDrop={e => { const id = e.dataTransfer.getData(MIME); setOverCol(null); if (id) pin(id, col.id); }}
              className={cn("rounded-xl border border-border/50 bg-background/50 p-2 transition-colors",
                overCol === col.id && "border-dashed border-primary bg-primary/5")}
            >
              <div className="group mb-1 flex items-center gap-1">
                {editing === col.id ? (
                  <input autoFocus defaultValue={col.title} aria-label="Section name"
                    onBlur={e => { rename(col.id, e.target.value); setEditing(null); }}
                    onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
                    className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary" />
                ) : (
                  <h4 className="flex-1 truncate text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {col.title} <span className="font-normal tabular-nums">{items.length}</span>
                  </h4>
                )}
                <button type="button" aria-label={`Rename ${col.title}`} onClick={() => setEditing(col.id)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"><Pencil className="h-3 w-3" /></button>
                <button type="button" aria-label={`Delete ${col.title}`} onClick={() => removeCol(col.id)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                <button type="button" aria-label={`Pin a task to ${col.title}`} onClick={() => { setPicking(picking === col.id ? null : col.id); setQuery(""); }} className="grid h-7 w-7 place-items-center rounded-md text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" /></button>
              </div>

              {picking === col.id && (
                <div className="mb-1.5 rounded-lg border border-border/60 bg-card p-1.5">
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your tasks…" aria-label="Search tasks to pin"
                    className="mb-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary" />
                  {candidates.length === 0 ? <p className="px-1 py-1 text-[11px] text-muted-foreground">No open tasks match.</p> :
                    candidates.map(t => (
                      <button key={t.id} type="button" onClick={() => { pin(t.id, col.id); setPicking(null); }}
                        className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-muted">
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        {t.area && <span className="shrink-0 text-[10px] text-muted-foreground">{t.area}</span>}
                      </button>
                    ))}
                </div>
              )}

              {items.length === 0 && picking !== col.id && (
                <p className="rounded-md border border-dashed border-border/60 px-2 py-2 text-center text-[11px] text-muted-foreground">Drop or pin a task here.</p>
              )}
              <ul className="space-y-1">
                {items.map(p => {
                  const t = byId.get(p.taskId);
                  return (
                    <li key={p.taskId} draggable
                      onDragStart={e => { e.dataTransfer.setData(MIME, p.taskId); e.dataTransfer.effectAllowed = "move"; }}
                      className={cn("group flex min-h-9 cursor-grab items-center gap-2 rounded-lg border border-border/40 bg-card px-2 active:cursor-grabbing", t.done && "opacity-60")}>
                      <button type="button" onClick={() => toggleTask(t.id)} aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
                        className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-full border border-primary/60", t.done && "bg-primary text-primary-foreground")}>
                        {t.done && <Check className="h-2.5 w-2.5" />}
                      </button>
                      <button type="button" onClick={() => openTaskEditor(t.id)} className={cn("min-w-0 flex-1 truncate text-left text-xs", t.done && "line-through")}>{t.title}</button>
                      {t.area && <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">{t.area}</span>}
                      <button type="button" onClick={() => unpin(t.id)} aria-label={`Unpin ${t.title}`} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
