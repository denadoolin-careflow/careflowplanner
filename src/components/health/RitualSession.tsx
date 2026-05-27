import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pause, Play, SkipForward, X, Check } from "lucide-react";
import { toast } from "sonner";

export type RitualStep = {
  title: string;
  seconds: number;
  cue?: string;
};

export type RitualTemplate = {
  id: string;
  name: string;
  intent: "restore" | "energize" | "ground" | "soften" | "play" | "breathe";
  intensity: "light" | "moderate" | "vigorous";
  description: string;
  emoji: string;
  color: string;
  steps: RitualStep[];
};

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function totalMinutes(t: RitualTemplate) {
  return Math.round(t.steps.reduce((s, x) => s + x.seconds, 0) / 60);
}

export function RitualSession({
  uid, template, onClose, onComplete,
}: {
  uid: string;
  template: RitualTemplate | null;
  onClose: () => void;
  onComplete?: () => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const startedRef = useRef<number>(0);

  useEffect(() => {
    if (!template) return;
    setStepIdx(0);
    setRemaining(template.steps[0]?.seconds ?? 0);
    setPlaying(true);
    setDone(false);
    startedRef.current = Date.now();
  }, [template?.id]);

  useEffect(() => {
    if (!template || !playing || done) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r > 1) return r - 1;
        setStepIdx(i => {
          const next = i + 1;
          if (next >= template.steps.length) {
            setDone(true);
            setPlaying(false);
            return i;
          }
          setRemaining(template.steps[next].seconds);
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, done, template]);

  if (!template) return null;

  const step = template.steps[stepIdx];
  const totalSec = template.steps.reduce((s, x) => s + x.seconds, 0);
  const elapsedSec =
    template.steps.slice(0, stepIdx).reduce((s, x) => s + x.seconds, 0) +
    (step.seconds - remaining);
  const progress = Math.min(100, (elapsedSec / totalSec) * 100);

  async function finish() {
    const minutes = Math.max(1, Math.round((Date.now() - startedRef.current) / 60000));
    const { error } = await supabase.from("movement_logs").insert({
      user_id: uid, date: today(), activity: template.name,
      minutes, intensity: template.intensity,
      notes: `[${template.intent}] Completed ritual: ${template.steps.length} steps`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Logged ${minutes}m — beautifully done 🌿`);
    onComplete?.();
    onClose();
  }

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div
          className="p-6 pb-5"
          style={{ background: `linear-gradient(160deg, ${template.color}33 0%, hsl(40 45% 96%) 100%)` }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>{template.emoji}</span>
              <span>{template.intent} · {totalMinutes(template)}m</span>
            </div>
            <DialogTitle className="font-display text-2xl">{template.name}</DialogTitle>
          </DialogHeader>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-card/60">
            <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: template.color }} />
          </div>
        </div>

        {done ? (
          <div className="space-y-4 p-6 text-center">
            <div
              className="mx-auto grid h-16 w-16 place-items-center rounded-full"
              style={{ background: `${template.color}22`, color: template.color }}
            >
              <Check className="h-7 w-7" />
            </div>
            <p className="font-display text-xl">Ritual complete</p>
            <p className="text-sm text-muted-foreground">Save this to your movement log?</p>
            <div className="flex justify-center gap-2">
              <Button variant="ghost" onClick={onClose}>Skip log</Button>
              <Button onClick={finish}>Save to movement</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Step {stepIdx + 1} of {template.steps.length}
              </p>
              <p className="mt-2 font-display text-2xl">{step.title}</p>
              {step.cue && <p className="mt-1 text-sm text-muted-foreground">{step.cue}</p>}
              <p className="mt-4 font-display text-5xl tabular-nums" style={{ color: template.color }}>
                {fmt(remaining)}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
              <Button onClick={() => setPlaying(p => !p)} className="w-32" style={{ background: template.color }}>
                {playing ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                {playing ? "Pause" : "Resume"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const next = stepIdx + 1;
                  if (next >= template.steps.length) { setDone(true); setPlaying(false); }
                  else { setStepIdx(next); setRemaining(template.steps[next].seconds); }
                }}
                aria-label="Skip"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <ol className="space-y-1 rounded-2xl bg-muted/40 p-3 text-xs">
              {template.steps.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                    i === stepIdx ? "bg-card font-medium" : i < stepIdx ? "text-muted-foreground/70 line-through" : "text-muted-foreground"
                  }`}
                >
                  <span className="w-6 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{s.title}</span>
                  <span className="tabular-nums">{fmt(s.seconds)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}