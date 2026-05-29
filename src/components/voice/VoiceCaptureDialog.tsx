import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Mic, Square, Loader2, Sparkles, RotateCcw, Wand2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { AREAS, type Area, type Priority, type TaskStatus } from "@/lib/types";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { aiInvoke } from "@/lib/ai-invoke";

type ProposedTask = {
  title: string;
  area: Area;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null;
  estMinutes?: number | null;
  tags?: string[];
  notes?: string;
  _selected: boolean;
};

type Phase = "intro" | "recording" | "processing" | "review";

function fmtElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function VoiceCaptureDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addTask } = useStore();
  const recorder = useAudioRecorder();
  const [phase, setPhase] = useState<Phase>("intro");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [proposed, setProposed] = useState<ProposedTask[]>([]);
  const [saving, setSaving] = useState(false);

  // Live in-browser interim transcript for visual feedback while recording.
  const liveDictation = useVoiceDictation((t) => setTranscript(t));

  // Reset every time the dialog re-opens.
  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setTranscript("");
    setSummary("");
    setProposed([]);
  }, [open]);

  const startRecording = async () => {
    setTranscript("");
    setSummary("");
    setProposed([]);
    setPhase("recording");
    await recorder.start();
    if (liveDictation.supported && !liveDictation.listening) liveDictation.start();
  };

  const stopAndProcess = async () => {
    if (liveDictation.listening) liveDictation.stop();
    const result = await recorder.stop();
    setPhase("processing");
    try {
      const payload: any = { transcript: transcript.trim() || undefined };
      if (result?.base64) {
        payload.audioBase64 = result.base64;
        payload.mimeType = result.mimeType;
      }
      if (!payload.audioBase64 && !payload.transcript) {
        toast.error("No audio captured. Try again or type into the field below.");
        setPhase("intro");
        return;
      }
      const { data, error } = await aiInvoke("ai-voice-capture", { body: payload });
      if (error) throw error;
      const tx = (data as any)?.transcript ?? transcript;
      const sm = (data as any)?.summary ?? "";
      const tasks = ((data as any)?.tasks ?? []) as Omit<ProposedTask, "_selected">[];
      setTranscript(tx);
      setSummary(sm);
      setProposed(tasks.map((t) => ({
        ...t,
        area: (AREAS as readonly string[]).includes(t.area) ? t.area : ("Personal" as Area),
        priority: t.priority ?? "medium",
        status: t.status ?? "active",
        _selected: true,
      })));
      setPhase("review");
    } catch (e: any) {
      console.error("voice capture failed", e);
      toast.error(e?.message?.includes("402")
        ? "AI credits exhausted. Add credits to keep going."
        : e?.message?.includes("429")
          ? "Too many requests — try again in a moment."
          : "Couldn't organize that. Try again or type your thoughts.");
      setPhase("review");
    }
  };

  const cancelRecording = () => {
    if (liveDictation.listening) liveDictation.stop();
    recorder.cancel();
    setPhase("intro");
  };

  const skipToText = () => {
    setPhase("review");
    if (proposed.length === 0) {
      setProposed([blankTask()]);
    }
  };

  const organizeText = async () => {
    if (!transcript.trim()) return;
    setPhase("processing");
    try {
      const { data, error } = await aiInvoke("ai-voice-capture", {
        body: { transcript: transcript.trim() },
      });
      if (error) throw error;
      const sm = (data as any)?.summary ?? "";
      const tasks = ((data as any)?.tasks ?? []) as Omit<ProposedTask, "_selected">[];
      setSummary(sm);
      setProposed(tasks.map((t) => ({
        ...t,
        area: (AREAS as readonly string[]).includes(t.area) ? t.area : ("Personal" as Area),
        priority: t.priority ?? "medium",
        status: t.status ?? "active",
        _selected: true,
      })));
      setPhase("review");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't organize that.");
      setPhase("review");
    }
  };

  const blankTask = (): ProposedTask => ({
    title: "", area: "Personal", priority: "medium", status: "active", _selected: true,
  });

  const update = (i: number, patch: Partial<ProposedTask>) =>
    setProposed((prev) => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  const remove = (i: number) => setProposed((prev) => prev.filter((_, idx) => idx !== i));

  const saveAll = async () => {
    const picked = proposed.filter((t) => t._selected && t.title.trim());
    if (picked.length === 0) {
      toast.error("Pick at least one task to save.");
      return;
    }
    setSaving(true);
    try {
      for (const t of picked) {
        await addTask({
          title: t.title.trim(),
          area: t.area,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ?? undefined,
          estMinutes: t.estMinutes ?? undefined,
          tags: t.tags && t.tags.length ? t.tags : undefined,
          notes: t.notes || undefined,
          inbox: !t.dueDate,
        });
      }
      toast.success(`Captured ${picked.length} task${picked.length === 1 ? "" : "s"}`, {
        description: summary || "Routed to your inbox & calendar.",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = proposed.length > 0 && proposed.every((t) => t._selected);
  const selectionCount = useMemo(() => proposed.filter((t) => t._selected).length, [proposed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-3 border-primary/20 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-4 w-4 text-primary" /> Voice capture
          </DialogTitle>
          <DialogDescription>
            Speak freely. We'll transcribe, summarize, and organize it into tasks.
          </DialogDescription>
        </DialogHeader>

        {phase === "intro" && (
          <div className="space-y-4">
            {!recorder.supported && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
                Your browser can't access the microphone. Type your thoughts below — we'll still organize them.
              </div>
            )}
            <button
              type="button"
              onClick={recorder.supported ? startRecording : undefined}
              disabled={!recorder.supported}
              className={cn(
                "group mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5",
                "border border-primary/30 shadow-cozy transition-transform hover:scale-105 active:scale-95",
                !recorder.supported && "opacity-50",
              )}
              aria-label="Start recording"
            >
              <Mic className="h-10 w-10 text-primary" />
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Tap to record. We use AI to transcribe and organize.
            </p>
            <div className="space-y-2">
              <Textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="…or type a brain dump and we'll still organize it."
                className="rounded-2xl bg-card/60 text-sm leading-relaxed"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={!transcript.trim()}
                onClick={organizeText}
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" /> Organize text
              </Button>
            </div>
          </div>
        )}

        {phase === "recording" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-rose-500/10 ring-4 ring-rose-500/20 animate-pulse">
              <Mic className="h-10 w-10 text-rose-500" />
            </div>
            <div className="text-center font-display text-2xl tabular-nums">
              {fmtElapsed(recorder.elapsedMs)}
            </div>
            {transcript && (
              <div className="max-h-32 overflow-auto rounded-xl border border-border/40 bg-card/60 p-3 text-sm text-muted-foreground">
                {transcript}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={cancelRecording}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Discard
              </Button>
              <Button onClick={stopAndProcess}>
                <Square className="mr-1 h-3.5 w-3.5" /> Stop & organize
              </Button>
            </div>
            {recorder.error && (
              <p className="text-center text-xs text-destructive">{recorder.error}</p>
            )}
          </div>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Transcribing and organizing…</div>
          </div>
        )}

        {phase === "review" && (
          <div className="space-y-4">
            {summary && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <div className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Summary
                </div>
                {summary}
              </div>
            )}
            <details className="rounded-xl border border-border/40 bg-card/40 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Transcript</summary>
              <Textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="mt-2 rounded-lg bg-background/60 text-sm leading-relaxed text-foreground"
              />
              <Button size="sm" variant="ghost" className="mt-2" onClick={organizeText}>
                <RotateCcw className="mr-1 h-3 w-3" /> Re-organize from edited transcript
              </Button>
            </details>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-1.5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(c) =>
                    setProposed((prev) => prev.map((t) => ({ ...t, _selected: !!c })))
                  }
                />
                Select all ({selectionCount}/{proposed.length})
              </label>
              <Button size="sm" variant="ghost" onClick={() => setProposed((p) => [...p, blankTask()])}>
                + Add row
              </Button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
              {proposed.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-center text-sm text-muted-foreground">
                  No tasks detected. Add one manually or re-record.
                </div>
              )}
              {proposed.map((t, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card/50 p-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={t._selected}
                      onCheckedChange={(c) => update(i, { _selected: !!c })}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Input
                        value={t.title}
                        onChange={(e) => update(i, { title: e.target.value })}
                        placeholder="Task title"
                        className="h-8 text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <select
                          value={t.area}
                          onChange={(e) => update(i, { area: e.target.value as Area })}
                          className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                        >
                          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <select
                          value={t.priority}
                          onChange={(e) => update(i, { priority: e.target.value as Priority })}
                          className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                        >
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                        </select>
                        <select
                          value={t.status}
                          onChange={(e) => update(i, { status: e.target.value as TaskStatus })}
                          className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                        >
                          <option value="active">active</option>
                          <option value="this_week">this week</option>
                          <option value="someday">someday</option>
                          <option value="waiting">waiting</option>
                        </select>
                        <input
                          type="date"
                          value={t.dueDate ?? ""}
                          onChange={(e) => update(i, { dueDate: e.target.value || null })}
                          className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                        />
                        {t.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="rounded-full px-2 py-0 text-[10px]">#{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(i)} aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={() => setPhase("intro")}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Start over
              </Button>
              <Button onClick={saveAll} disabled={saving || selectionCount === 0}>
                {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />}
                Save {selectionCount || ""} task{selectionCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}