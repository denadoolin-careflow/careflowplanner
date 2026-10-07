/**
 * Global "Add to…" capture: type a thought once, then drop it into any
 * existing note (as a line, bullet, or checklist item) or any open task
 * (appended to its notes). Opened with `openAppendTo()` from anywhere.
 */
import { useEffect, useMemo, useState } from "react";
import { CheckSquare, FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createNote, getNote, listNotes, updateNote, type Note } from "@/lib/notes";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const EVT = "careflow:append-to";
export function openAppendTo(detail?: { text?: string; target?: "note" | "task" }) {
  window.dispatchEvent(new CustomEvent(EVT, { detail }));
}

type Format = "line" | "bullet" | "check";
const noteTitle = (n: Note) => n.title?.trim() || (n.date ? `${n.kind} · ${n.date}` : "Untitled");

export function AppendToDialog() {
  const { state, updateTask } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<"note" | "task">("note");
  const [fmt, setFmt] = useState<Format>("bullet");
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      setText(d.text ?? ""); setTarget(d.target ?? "note"); setQ(""); setOpen(true);
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  useEffect(() => { if (open) void listNotes().then(setNotes).catch(() => {}); }, [open]);

  const term = q.trim().toLowerCase();
  const noteHits = useMemo(() => notes.filter(n => !term || noteTitle(n).toLowerCase().includes(term)).slice(0, 30), [notes, term]);
  const taskHits = useMemo(() => (state.tasks ?? []).filter(t => !t.done && (!term || t.title.toLowerCase().includes(term))).slice(0, 30), [state.tasks, term]);

  const line = () => {
    const t = text.trim();
    return fmt === "check" ? `- [ ] ${t}` : fmt === "bullet" ? `- ${t}` : t;
  };

  const toNote = async (id: string, title: string) => {
    if (!text.trim()) return toast.message("Type something to add first");
    setBusy(true);
    try {
      const fresh = await getNote(id);
      const body = (fresh?.body ?? "").replace(/\s+$/, "");
      await updateNote(id, { body: body ? `${body}\n\n${line()}` : line() });
      toast.success(`Added to ${title}`);
      setOpen(false);
    } catch { toast.error("Couldn't add to that note"); }
    finally { setBusy(false); }
  };
  const toNewNote = async () => {
    if (!text.trim()) return toast.message("Type something to add first");
    setBusy(true);
    try {
      const firstLine = text.trim().split("\n")[0].slice(0, 60);
      await createNote({ title: q.trim() || firstLine, body: line() });
      toast.success("New note created");
      setOpen(false);
    } catch { toast.error("Couldn't create note"); }
    finally { setBusy(false); }
  };
  const toTask = async (id: string, title: string, existing?: string) => {
    if (!text.trim()) return toast.message("Type something to add first");
    setBusy(true);
    try {
      const prev = (existing ?? "").replace(/\s+$/, "");
      await updateTask(id, { notes: prev ? `${prev}\n${line()}` : line() });
      toast.success(`Added to ${title}`);
      setOpen(false);
    } catch { toast.error("Couldn't add to that task"); }
    finally { setBusy(false); }
  };

  const rowCls = "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90svh] gap-3 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to a note or task</DialogTitle>
          <DialogDescription>Write once, then choose where it goes.</DialogDescription>
        </DialogHeader>
        <Textarea autoFocus value={text} onChange={e => setText(e.target.value)} placeholder="What do you want to add?" className="min-h-[84px]" />
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Add as" className="inline-flex rounded-full border border-border/60 p-0.5">
            {(["line", "bullet", "check"] as Format[]).map(f => (
              <button key={f} type="button" aria-pressed={fmt === f} onClick={() => setFmt(f)}
                className={cn("min-h-9 rounded-full px-3 text-xs", fmt === f ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {f === "line" ? "Text" : f === "bullet" ? "Bullet" : "Checklist"}
              </button>
            ))}
          </div>
          <div role="tablist" aria-label="Destination" className="ml-auto inline-flex rounded-full border border-border/60 p-0.5">
            {(["note", "task"] as const).map(t => (
              <button key={t} type="button" role="tab" aria-selected={target === t} onClick={() => setTarget(t)}
                className={cn("inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs", target === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {t === "note" ? <FileText className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}{t === "note" ? "Note" : "Task"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={target === "note" ? "Find a note…" : "Find a task…"} className="pl-9" />
        </div>
        <div className="max-h-[38svh] space-y-0.5 overflow-y-auto overscroll-contain">
          {target === "note" ? (
            <>
              <button type="button" disabled={busy} onClick={() => void toNewNote()} className={cn(rowCls, "text-primary")}>
                <Plus className="h-4 w-4" /> New note{q.trim() ? ` “${q.trim()}”` : ""}
              </button>
              {noteHits.map(n => (
                <button key={n.id} type="button" disabled={busy} onClick={() => void toNote(n.id, noteTitle(n))} className={rowCls}>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{noteTitle(n)}</span>
                </button>
              ))}
            </>
          ) : taskHits.length ? taskHits.map(t => (
            <button key={t.id} type="button" disabled={busy} onClick={() => void toTask(t.id, t.title, t.notes)} className={rowCls}>
              <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{t.title}</span>
            </button>
          )) : <p className="px-2 py-3 text-sm text-muted-foreground">No open tasks match.</p>}
        </div>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </DialogContent>
    </Dialog>
  );
}
