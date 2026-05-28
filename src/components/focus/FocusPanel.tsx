import { useEffect, useState } from "react";
import {
  Pause, Play, RotateCcw, SkipForward, Sparkles, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Brain, Coffee, X, Music2, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  formatPomoTime, pomoTotal, pomodoro, usePomodoro,
  POMODORO_TEMPLATES,
} from "@/lib/pomodoro-store";
import {
  SOUNDSCAPES, ATMOSPHERE_SOUND_MAP, useSoundscape, getSoundscape,
  type SoundscapeId,
} from "@/lib/soundscape";
import { useAtmosphere } from "@/lib/atmospheres";
import { MusicEmbed } from "./MusicEmbed";

const DOCK_KEY = "careflow:focus:dock";
const OPEN_KEY = "careflow:focus:open";

function readBool(key: string, dflt: boolean) {
  if (typeof localStorage === "undefined") return dflt;
  const v = localStorage.getItem(key);
  return v === null ? dflt : v === "1";
}

/** Sticky right-side floating focus panel: Pomodoro + soundscape + atmosphere. */
export function FocusPanel() {
  const s = usePomodoro();
  const sound = useSoundscape();
  const { atmosphere, current: atmoId } = useAtmosphere();

  const [docked, setDocked] = useState(() => readBool(DOCK_KEY, false));
  const [open, setOpen] = useState(() => readBool(OPEN_KEY, false));

  useEffect(() => { try { localStorage.setItem(DOCK_KEY, docked ? "1" : "0"); } catch { /* noop */ } }, [docked]);
  useEffect(() => { try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* noop */ } }, [open]);

  // Auto-suggest a soundscape when atmosphere changes (if auto-follow on and nothing playing yet).
  useEffect(() => {
    if (!sound.autoFollow) return;
    if (sound.playing) return;
    const suggested = ATMOSPHERE_SOUND_MAP[atmoId]?.[0];
    if (suggested && suggested !== sound.current) {
      // Set as the current selection without auto-starting audio (needs user gesture).
      // We just update the local pointer so the UI reflects the suggestion.
      // Play happens on user click.
    }
    void suggested; // referenced for clarity
  }, [atmoId, sound.autoFollow, sound.playing, sound.current]);

  if (docked) {
    return (
      <button
        type="button"
        aria-label="Open focus panel"
        onClick={() => setDocked(false)}
        className={cn(
          "fixed right-3 top-1/2 z-30 -translate-y-1/2 rounded-l-2xl",
          "border border-r-0 border-border/60 bg-card/80 px-2 py-3 backdrop-blur-md",
          "shadow-lg hover:bg-card transition-colors",
        )}
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <span className="sr-only">Focus</span>
      </button>
    );
  }

  const total = pomoTotal(s.mode, s);
  const pct = Math.min(100, Math.max(0, ((total - s.remaining) / Math.max(1, total)) * 100));
  const idle = !s.taskId && !s.running && s.remaining === total;
  const isFocus = s.mode === "focus";

  const suggestedIds = ATMOSPHERE_SOUND_MAP[atmoId] ?? [];
  const currentSoundId: SoundscapeId | null = sound.current ?? suggestedIds[0] ?? null;
  const currentSound = getSoundscape(currentSoundId);

  return (
    <aside
      className={cn(
        "fixed right-3 top-20 z-30 hidden md:block",
        "transition-all duration-300 ease-out",
      )}
      style={{ width: open ? 320 : 92 }}
      aria-label="Focus panel"
    >
      <div
        className={cn(
          "relative rounded-3xl border border-border/60 bg-card/80 p-3 backdrop-blur-xl",
          "shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]",
          "max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain",
          "[scrollbar-width:thin]",
          isFocus && s.running && "ring-1 ring-primary/30",
        )}
      >
        {/* aurora glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-60 blur-2xl"
          style={{
            background: `radial-gradient(120% 60% at 50% 0%, hsl(var(--primary)/0.25), transparent 70%)`,
          }}
        />

        {/* header */}
        <div className="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3 w-3" />
            {open ? "Focus" : ""}
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/50"
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setDocked(true)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted/50"
              aria-label="Dock to edge"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* timer ring */}
        <FocusRing
          size={open ? 200 : 72}
          stroke={open ? 10 : 6}
          pct={pct}
          mode={s.mode}
          breathing={!isFocus && s.running}
        >
          <div className="flex flex-col items-center leading-none">
            <div className={cn("font-display tabular-nums text-gradient-glow font-semibold", open ? "text-4xl" : "text-base")}>
              {formatPomoTime(s.remaining)}
            </div>
            {open && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {isFocus ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
                {isFocus ? "focus" : "break"}
              </div>
            )}
          </div>
        </FocusRing>

        {open && (
          <p className="mt-2 line-clamp-2 text-center text-sm font-medium">
            {s.taskTitle || "Pick a soft session to begin."}
          </p>
        )}

        {/* controls */}
        <div className={cn("mt-2 flex items-center justify-center gap-1.5", !open && "flex-col")}>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full shadow"
            onClick={() => {
              if (!s.taskId && idle) {
                const t = POMODORO_TEMPLATES.find(x => x.id === "classic")!;
                pomodoro.startTemplate({ label: t.label, focusSeconds: t.focusSeconds, breakSeconds: t.breakSeconds, templateId: t.id });
              } else {
                pomodoro.toggle();
              }
            }}
            aria-label={s.running ? "Pause" : "Start"}
          >
            {s.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {open && (
            <>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => pomodoro.reset()} aria-label="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => pomodoro.switchMode()} aria-label={isFocus ? "Skip to break" : "Skip to focus"}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <FocusDurationEditor focusSeconds={s.focusSeconds} breakSeconds={s.breakSeconds} />
            </>
          )}
        </div>

        {open && (
          <>
            {/* templates */}
            {idle && (
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                {POMODORO_TEMPLATES.slice(0, 4).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pomodoro.startTemplate({ label: t.label, focusSeconds: t.focusSeconds, breakSeconds: t.breakSeconds, templateId: t.id })}
                    className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] hover:border-primary/40 hover:bg-primary/5"
                  >
                    {t.label.replace(" sprint", "").replace(" focus", "")} · {Math.round(t.focusSeconds / 60)}m
                  </button>
                ))}
              </div>
            )}

            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {s.completed === 0 ? "First soft session today." : `${s.completed} session${s.completed > 1 ? "s" : ""} complete today.`}
            </p>

            {/* soundscape */}
            <div className="mt-3 rounded-2xl border border-border/50 bg-background/40 p-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Music2 className="h-3 w-3" /> Soundscape
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>Auto</span>
                  <Switch
                    checked={sound.autoFollow}
                    onCheckedChange={sound.setAutoFollow}
                    className="scale-75"
                    aria-label="Follow atmosphere"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => currentSoundId && (sound.playing ? sound.pause() : sound.play(currentSoundId))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                  aria-label={sound.playing ? "Pause sound" : "Play sound"}
                >
                  {sound.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium">
                    {currentSound ? `${currentSound.emoji}  ${currentSound.label}` : "Pick a soundscape"}
                  </div>
                  <Waveform active={sound.playing} />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                {sound.volume === 0 ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
                <Slider
                  value={[Math.round(sound.volume * 100)]}
                  max={100}
                  step={1}
                  onValueChange={(v) => sound.setVolume((v[0] ?? 0) / 100)}
                  className="flex-1"
                  aria-label="Volume"
                />
              </div>

              {/* recommended for atmosphere */}
              {suggestedIds.length > 0 && (
                <div className="mt-2">
                  <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                    For {atmosphere.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {suggestedIds.map(id => {
                      const sc = getSoundscape(id);
                      if (!sc) return null;
                      const active = currentSoundId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => sound.play(id)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                            active
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/60 bg-muted/30 hover:border-primary/40",
                          )}
                        >
                          {sc.emoji} {sc.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* full library */}
              <details className="mt-2">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                  All soundscapes
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {SOUNDSCAPES.map(sc => {
                    const active = currentSoundId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => sound.play(sc.id)}
                        title={sc.hint}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                          active
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border/60 bg-muted/30 hover:border-primary/40",
                        )}
                      >
                        {sc.emoji} {sc.label}
                      </button>
                    );
                  })}
                </div>
              </details>
            </div>

            {/* music (Spotify / YouTube) */}
            <MusicEmbed autoplay={isFocus && s.running} />
          </>
        )}

        {/* mini collapsed sound dot */}
        {!open && currentSound && (
          <button
            type="button"
            onClick={() => sound.toggle()}
            className="mt-2 mx-auto flex w-full items-center justify-center gap-1 rounded-full border border-border/60 bg-muted/30 px-1.5 py-1 text-[10px]"
            aria-label="Toggle soundscape"
          >
            <span>{currentSound.emoji}</span>
            <span className={cn("h-1.5 w-1.5 rounded-full", sound.playing ? "bg-primary animate-pulse" : "bg-muted-foreground/40")} />
          </button>
        )}
      </div>
    </aside>
  );
}

/* ── Ring ── */
function FocusRing({
  size, stroke, pct, mode, breathing, children,
}: {
  size: number; stroke: number; pct: number; mode: "focus" | "break"; breathing: boolean; children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div
      className={cn("relative mx-auto", breathing && "animate-pulse")}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="focus-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent-foreground))" />
          </linearGradient>
          <radialGradient id="focus-ring-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="url(#focus-ring-fill)"
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={mode === "focus" ? "url(#focus-ring-grad)" : "hsl(var(--muted-foreground))"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary)/0.45))" }}
          className="transition-[stroke-dashoffset] duration-700 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ── Tiny waveform animation ── */
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="mt-1 flex h-3 items-end gap-[2px]">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
        <span
          key={i}
          className={cn(
            "w-[2px] rounded-full bg-primary/60",
            active ? "animate-pulse" : "opacity-30",
          )}
          style={{
            height: `${active ? 30 + Math.sin(i * 0.9) * 25 + (i % 3) * 15 : 20}%`,
            animationDelay: `${i * 70}ms`,
            animationDuration: `${900 + (i % 4) * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Custom duration editor ── */
function FocusDurationEditor({ focusSeconds, breakSeconds }: { focusSeconds: number; breakSeconds: number }) {
  const [open, setOpen] = useState(false);
  const [focusMin, setFocusMin] = useState(Math.round(focusSeconds / 60));
  const [breakMin, setBreakMin] = useState(Math.round(breakSeconds / 60));

  useEffect(() => { setFocusMin(Math.round(focusSeconds / 60)); }, [focusSeconds]);
  useEffect(() => { setBreakMin(Math.round(breakSeconds / 60)); }, [breakSeconds]);

  const clamp = (n: number, min: number, max: number) =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;

  const apply = () => {
    const f = clamp(focusMin, 1, 180);
    const b = clamp(breakMin, 1, 60);
    setFocusMin(f); setBreakMin(b);
    pomodoro.setDurations({ focusSeconds: f * 60, breakSeconds: b * 60 });
    setOpen(false);
  };

  const PRESETS: Array<{ f: number; b: number; label: string }> = [
    { f: 15, b: 5, label: "15 / 5" },
    { f: 25, b: 5, label: "25 / 5" },
    { f: 50, b: 10, label: "50 / 10" },
    { f: 90, b: 20, label: "90 / 20" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Customize timer durations">
          <Pencil className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Custom durations
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tune focus & break to fit your energy.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="focus-pomo-focus" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Focus (min)
            </Label>
            <Input
              id="focus-pomo-focus"
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={focusMin}
              onChange={(e) => setFocusMin(Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="focus-pomo-break" className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Break (min)
            </Label>
            <Input
              id="focus-pomo-break"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              className="h-8"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setFocusMin(p.f); setBreakMin(p.b); }}
              className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}