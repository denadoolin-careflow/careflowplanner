import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CloudOff, Loader2, Maximize2, Minimize2, Wind } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlockEditor } from "@/components/notes/BlockEditor";
import { PomodoroPanel } from "@/components/tasks/PomodoroPanel";
import { NoteTOC } from "@/components/notes/NoteTOC";
import { useStore } from "@/lib/store";
import { usePomodoro, formatPomoTime, pomoTotal } from "@/lib/pomodoro-store";
import { cn } from "@/lib/utils";

export default function JournalFlow() {
  const { addJournal, updateJournal } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const entryIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  const doSave = async (t: string, b: string) => {
    const finalBody = b.trim();
    if (!finalBody && !t.trim()) return;
    setStatus("saving");
    try {
      if (!entryIdRef.current) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        const created = await addJournal({
          body: finalBody,
          type: "daily",
          title: t || undefined,
          template: "daily",
          tags: ["flow"],
        } as any);
        creatingRef.current = false;
        if (created) entryIdRef.current = created.id;
      } else {
        await updateJournal(entryIdRef.current, {
          body: finalBody,
          title: t || undefined,
        });
      }
      dirtyRef.current = false;
      setStatus("saved");
      setSavedAt(new Date());
    } catch {
      setStatus("error");
    }
  };

  // Debounced autosave on changes
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void doSave(title, body); }, 900);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  // Flush on unmount / page hide
  useEffect(() => {
    const flush = () => { if (dirtyRef.current) void doSave(title, body); };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  const onTitle = (v: string) => { dirtyRef.current = true; setTitle(v); };
  const onBody = (v: string) => { dirtyRef.current = true; setBody(v); };

  const newEntry = () => {
    if (dirtyRef.current) void doSave(title, body);
    entryIdRef.current = null;
    setTitle(""); setBody("");
    setStatus("idle"); setSavedAt(null);
  };

  return (
    <div className="-m-4 md:-m-6 flex min-h-[calc(100vh-3rem)] flex-col bg-background lg:flex-row">
      {/* Sidebar — gradient Pomodoro */}
      <aside
        className={cn(
          "relative flex flex-col gap-5 overflow-hidden border-b border-border/40 px-6 py-6 text-foreground lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r",
          "bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.35),transparent_55%),radial-gradient(circle_at_80%_80%,hsl(var(--accent)/0.4),transparent_60%),linear-gradient(160deg,hsl(var(--card)),hsl(var(--muted)))]",
        )}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/journal"
            className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground/80 backdrop-blur hover:bg-background"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Journal
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/70 backdrop-blur">
            <Wind className="h-3.5 w-3.5 text-primary" /> Flow mode
          </span>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold leading-tight">Journal &amp; Flow</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A pomodoro by your side. Write softly, in cycles.
          </p>
        </div>

        <PomodoroPanel className="border border-border/40 bg-background/70 shadow-sm backdrop-blur" />

        <Button
          variant="secondary"
          className="mt-auto h-9 w-full rounded-full bg-background/70 backdrop-blur hover:bg-background"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="mr-2 h-4 w-4" /> Enter full-screen focus
        </Button>

        <p className="text-center text-[11px] italic text-muted-foreground">
          Breathe in for four. Out for six. Begin when ready.
        </p>
      </aside>

      {/* Editor pane */}
      <section className="flex flex-1 flex-col px-4 py-6 md:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {format(new Date(), "EEEE · MMMM d")}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-tight">Today's pages</h1>
            </div>
            <div className="flex items-center gap-3">
              <SaveStatus status={status} savedAt={savedAt} />
              <Button variant="outline" size="sm" onClick={newEntry} className="rounded-full">
                New entry
              </Button>
            </div>
          </header>

          <Input
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder="A title, if one finds you…"
            className="h-auto border-0 bg-transparent px-0 font-display text-2xl font-semibold shadow-none focus-visible:ring-0"
          />

          <div className="mt-3 flex-1 rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
            <BlockEditor
              body={body}
              onChange={(md) => onBody(md)}
              placeholder="Begin anywhere. Press / for headings, lists, quotes…"
            />
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Markdown supported · / for blocks · ⌘B bold · ⌘I italic · ⌘K link
          </p>
        </div>
      </section>

      {fullscreen && <FullscreenTimer onClose={() => setFullscreen(false)} />}
    </div>
  );
}

function FullscreenTimer({ onClose }: { onClose: () => void }) {
  const s = usePomodoro();
  const total = pomoTotal(s.mode, s);
  const pct = ((total - s.remaining) / total) * 100;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center",
        "bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.5),transparent_55%),radial-gradient(circle_at_80%_70%,hsl(var(--accent)/0.55),transparent_60%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card)))]",
        "backdrop-blur-xl animate-in fade-in duration-300",
      )}
    >
      <button
        onClick={onClose}
        className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-background"
      >
        <Minimize2 className="h-3.5 w-3.5" /> Exit
      </button>

      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">
          {s.mode === "focus" ? "Focus" : "Breathe"}
        </p>
        <div className="mt-6 font-display text-[18vw] leading-none tabular-nums sm:text-[12rem]">
          {formatPomoTime(s.remaining)}
        </div>
        <div className="mx-auto mt-8 h-1.5 w-64 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-6 max-w-md text-sm text-muted-foreground">
          {s.taskTitle || "Soft attention. One breath at a time."}
        </p>
      </div>

      <div className="absolute bottom-10 w-full max-w-md px-6">
        <PomodoroPanel className="border border-border/40 bg-background/70 shadow-lg backdrop-blur" />
      </div>
    </div>
  );
}

function SaveStatus({ status, savedAt }: { status: "idle" | "saving" | "saved" | "error"; savedAt: Date | null }) {
  if (status === "saving") return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-xs text-destructive"><CloudOff className="h-3 w-3" /> Save failed</span>;
  if (status === "saved" && savedAt) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3 text-primary" /> Saved {format(savedAt, "h:mm a")}</span>;
  return <span className="text-xs text-muted-foreground/70">Autosave on</span>;
}