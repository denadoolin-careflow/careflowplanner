import { useEffect, useMemo, useState } from "react";
import { Inbox, Plus, Mic, Sparkles, Trash2, GripVertical } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export const CV2_TASK_MIME = "application/x-careflow-v2-task";
export const CV2_CAPTURE_MIME = "application/x-careflow-v2-capture";

export interface Capture { id: string; title: string; category?: string; createdAt: string; }

const K = "careflow:cv2:inbox";

function loadCaptures(): Capture[] {
  try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; }
}
function saveCaptures(list: Capture[]) {
  try { localStorage.setItem(K, JSON.stringify(list)); } catch {}
}

/**
 * Universal Inbox — quick capture plus drag source for both unscheduled
 * tasks (from the real store) and lightweight captures (localStorage).
 */
export function UniversalInbox({ unscheduled }: { unscheduled: Task[] }) {
  const { addTask } = useStore();
  const [captures, setCaptures] = useState<Capture[]>(() => loadCaptures());
  const [draft, setDraft] = useState("");
  useEffect(() => saveCaptures(captures), [captures]);

  const capture = () => {
    const title = draft.trim();
    if (!title) return;
    setCaptures((c) => [{ id: crypto.randomUUID(), title, category: guessCategory(title), createdAt: new Date().toISOString() }, ...c]);
    setDraft("");
  };

  const promoteToTask = async (c: Capture) => {
    await addTask({ title: c.title, area: "Personal", priority: "medium", inbox: true, done: false });
    setCaptures((list) => list.filter((x) => x.id !== c.id));
  };

  const items = useMemo(() => ({
    captures,
    tasks: unscheduled.slice(0, 20),
  }), [captures, unscheduled]);

  return (
    <section className="reset-glass flex h-full min-h-[380px] flex-col rounded-3xl p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Inbox className="h-4 w-4 text-primary" /> Universal inbox
        </div>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {items.captures.length + items.tasks.length}
        </span>
      </header>

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && capture()}
          placeholder="Capture anything — press Enter"
          className="h-9 bg-background/70"
          aria-label="Capture into inbox"
        />
        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={capture} aria-label="Add"><Plus className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-9 w-9" disabled title="Voice capture (coming soon)"><Mic className="h-4 w-4" /></Button>
      </div>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.captures.length === 0 && items.tasks.length === 0 && (
          <p className="rounded-xl border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
            Everything's clear. Capture a thought above.
          </p>
        )}

        {items.captures.map((c) => (
          <DragRow
            key={c.id}
            mime={CV2_CAPTURE_MIME}
            payload={c.id}
            title={c.title}
            badge={c.category ?? "Idea"}
            trailing={
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => promoteToTask(c)}>
                  <Sparkles className="mr-1 h-3 w-3" />Task
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setCaptures((l) => l.filter((x) => x.id !== c.id))} aria-label="Delete">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            }
          />
        ))}

        {items.tasks.map((t) => (
          <DragRow
            key={t.id}
            mime={CV2_TASK_MIME}
            payload={t.id}
            title={t.title}
            badge={`${t.estMinutes ?? 25}m`}
          />
        ))}
      </div>
    </section>
  );
}

function DragRow({
  mime, payload, title, badge, trailing,
}: { mime: string; payload: string; title: string; badge?: string; trailing?: React.ReactNode }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(mime, payload);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-2.5 py-2 text-sm active:cursor-grabbing",
        "hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
      <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere]">{title}</span>
      {badge && <span className="shrink-0 rounded-full bg-muted/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{badge}</span>}
      {trailing}
    </div>
  );
}

function guessCategory(t: string): string {
  const s = t.toLowerCase();
  if (/grocer|milk|eggs|bread|store/.test(s)) return "Grocery";
  if (/call|email|text|reply/.test(s)) return "Comm";
  if (/clean|laundry|dish|vacuum|trash/.test(s)) return "Home";
  if (/appt|doctor|therapy|dentist/.test(s)) return "Care";
  return "Idea";
}