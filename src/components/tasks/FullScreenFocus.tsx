import { useEffect, useMemo, useState } from "react";
import { Brain, Coffee, Maximize2, Minimize2, Pause, Play, RotateCcw, Sparkles, Square, Volume2, VolumeX, X, NotebookPen, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPomoTime, pomoTotal, pomodoro, usePomodoro } from "@/lib/pomodoro-store";
import { SOUNDSCAPES, soundscapes, type SoundscapeId } from "@/lib/soundscapes";
import { AFFIRMATIONS } from "@/lib/affirmations";
import { useStoreOptional } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FOCUS_FULLSCREEN_EVENT = "pomodoro:fullscreen";

function affirmationFor(taskId: string | null, taskTitle: string) {
  // Stable per-task pick so it doesn't flicker.
  const key = (taskId ?? taskTitle ?? "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AFFIRMATIONS[key % AFFIRMATIONS.length];
}

export function FullScreenFocus() {
  const s = usePomodoro();
  const ctx = useStoreOptional();
  const state = ctx?.state;
  const [open, setOpen] = useState(false);
  const [scape, setScape] = useState<SoundscapeId>(soundscapes.current());
  const [vol, setVol] = useState(soundscapes.getVolume());
  const [worked, setWorked] = useState("");
  const [hard, setHard] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  // Reset reflection when the active task changes.
  useEffect(() => {
    setWorked(""); setHard(""); setGratitude(""); setSavedFor(null);
  }, [s.taskId]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(FOCUS_FULLSCREEN_EVENT, handler);
    return () => window.removeEventListener(FOCUS_FULLSCREEN_EVENT, handler);
  }, []);

  // Esc to exit
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => (state?.tasks ?? [])
      .filter(t => !t.done && t.id !== s.taskId)
      .filter(t => !t.dueDate || t.dueDate <= todayISO || t.isTopThree)
      .sort((a, b) => Number(!!b.isTopThree) - Number(!!a.isTopThree))
      .slice(0, 8),
    [state?.tasks, s.taskId, todayISO],
  );

  if (!open || !s.taskId) return null;

  const total = pomoTotal(s.mode, s);
  const pct = ((total - s.remaining) / total) * 100;
  const isFocus = s.mode === "focus";

  // Big ring
  const size = 320;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  const affirmation = affirmationFor(s.taskId, s.taskTitle);

  const switchTask = (id: string, title: string) => {
    pomodoro.startForTask(
      { id, title },
      { focusSeconds: s.focusSeconds, breakSeconds: s.breakSeconds },
    );
  };

  const setSoundscape = (id: SoundscapeId) => {
    setScape(id);
    soundscapes.play(id);
  };
  const onVolume = (v: number) => {
    setVol(v);
    soundscapes.setVolume(v);
  };

  const saveReflection = async () => {
    if (!s.taskId) return;
    if (!worked.trim() && !hard.trim() && !gratitude.trim()) {
      toast.message("Add a quick note first");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Not signed in");
      const body = [
        `Task: ${s.taskTitle || "(untitled)"}`,
        worked.trim() && `What worked: ${worked.trim()}`,
        hard.trim() && `What felt hard: ${hard.trim()}`,
        gratitude.trim() && `Gratitude: ${gratitude.trim()}`,
      ].filter(Boolean).join("\n");
      const { error } = await supabase.from("journal_entries").insert({
        user_id: u.user.id,
        type: "gratitude",
        title: `Focus reflection · ${s.taskTitle || "task"}`.slice(0, 120),
        body,
        date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      setSavedFor(s.taskId);
      toast.success("Reflection saved to journal");
    } catch (e: any) {
      toast.error(e?.message || "Could not save reflection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col overflow-y-auto",
        "animate-fade-in",
        // Layered gradient that adapts to focus/break
        isFocus
          ? "bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.35),transparent_60%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.35),transparent_55%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card)))]"
          : "bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.4),transparent_60%),radial-gradient(ellipse_at_bottom_left,hsl(var(--secondary)/0.4),transparent_55%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card)))]",
      )}
      role="dialog"
      aria-label="Focus full screen"
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {isFocus ? <Brain className="h-4 w-4 text-primary" /> : <Coffee className="h-4 w-4" />}
          {isFocus ? "Focus session" : "Soft break"}
          {s.templateLabel && <span className="hidden sm:inline">· {s.templateLabel}</span>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={() => setOpen(false)}
          aria-label="Exit full screen"
        >
          <Minimize2 className="mr-1 h-3.5 w-3.5" /> Exit
        </Button>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
        {/* Visual cue: large icon + task title */}
        <div className={cn(
          "mb-4 grid h-20 w-20 place-items-center rounded-3xl",
          isFocus ? "bg-primary/15 text-primary" : "bg-accent/30 text-accent-foreground",
          "shadow-lg shadow-primary/10",
        )}>
          {isFocus ? <Sparkles className="h-9 w-9" /> : <Coffee className="h-9 w-9" />}
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Currently focused on</p>
        <h2 className="mt-1 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          {s.taskTitle || "A small thing, gently."}
        </h2>

        {/* Big ring + time */}
        <div className="relative mt-8" style={{ width: size, height: size, maxWidth: "82vw", maxHeight: "82vw" }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 h-full w-full">
            <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" opacity={0.4} />
            <circle
              cx={size/2} cy={size/2} r={r}
              stroke={isFocus ? "hsl(var(--primary))" : "hsl(var(--accent-foreground))"}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-700 ease-linear drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-6xl font-semibold tabular-nums text-foreground sm:text-7xl drop-shadow-[0_2px_8px_hsl(var(--background)/0.6)]">
              {formatPomoTime(s.remaining)}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
              {isFocus ? "focus" : "break"} · {Math.round(pct)}%
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-2">
          <Button size="lg" onClick={() => pomodoro.toggle()} className="rounded-full px-6">
            {s.running ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Resume</>}
          </Button>
          <Button size="lg" variant="outline" onClick={() => pomodoro.reset()} className="rounded-full" aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => { soundscapes.stop(); pomodoro.stop(); setOpen(false); }} className="rounded-full text-muted-foreground hover:text-destructive" aria-label="End session">
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {/* Affirmation */}
        <p className="mt-8 max-w-xl text-center font-display text-lg italic text-muted-foreground">
          "{affirmation}"
        </p>
      </div>

      {/* Bottom panels: soundscape + next task */}
      <div className="relative z-10 grid gap-4 border-t border-border/50 bg-background/40 p-4 backdrop-blur-md sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {/* Soundscape */}
        <div className="cozy-card rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5" /> Soundscape
            </div>
            <button
              type="button"
              onClick={() => setSoundscape("off")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              <VolumeX className="inline h-3 w-3 mr-1" /> mute
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SOUNDSCAPES.filter(x => x.id !== "off").map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSoundscape(o.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-all",
                  scape === o.id
                    ? "border-primary/60 bg-primary/15 text-foreground shadow-sm"
                    : "border-border/60 bg-background hover:border-primary/40",
                )}
                title={o.hint}
              >
                <span className="mr-1">{o.emoji}</span>{o.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume</span>
            <Slider
              value={[Math.round(vol * 100)]}
              max={100}
              step={1}
              onValueChange={([v]) => onVolume(v / 100)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Next task picker */}
        <div className="cozy-card rounded-3xl border border-border/60 bg-card/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Focus on next</div>
            <span className="text-[11px] text-muted-foreground">{upcoming.length} ready</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing else queued for today. Beautiful.</p>
          ) : (
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pr-1">
              {upcoming.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTask(t.id, t.title)}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-left text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <span className="min-w-0 truncate">
                    {t.isTopThree && <span className="mr-1 text-primary">★</span>}
                    {t.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary">
                    {t.area}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick reflection */}
        <div className="cozy-card rounded-3xl border border-border/60 bg-card/70 p-4 sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <NotebookPen className="h-3.5 w-3.5" /> Quick reflection
            </div>
            {savedFor === s.taskId && (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                <Check className="h-3 w-3" /> saved
              </span>
            )}
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Tied to <span className="font-medium text-foreground">{s.taskTitle || "this task"}</span>
          </p>
          <div className="space-y-2">
            <Textarea
              value={worked}
              onChange={(e) => setWorked(e.target.value)}
              placeholder="What worked?"
              rows={2}
              className="resize-none bg-background/60 text-sm"
            />
            <Textarea
              value={hard}
              onChange={(e) => setHard(e.target.value)}
              placeholder="What felt hard?"
              rows={2}
              className="resize-none bg-background/60 text-sm"
            />
            <Textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="One gratitude…"
              rows={2}
              className="resize-none bg-background/60 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={saveReflection}
            disabled={saving}
            className="mt-3 w-full rounded-full"
          >
            {saving ? "Saving…" : "Save to journal"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Helper used by other components to open the full-screen view. */
export function openFullScreenFocus() {
  window.dispatchEvent(new Event(FOCUS_FULLSCREEN_EVENT));
}