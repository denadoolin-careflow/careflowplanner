import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RotateCw, Sparkles, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteVoiceMemo, ensureVoiceMemo, fmtMemoDuration, summarizeVoiceMemo, transcribeVoiceMemo,
  updateVoiceMemo, type VoiceMemoRow,
} from "@/lib/voice-memos";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function AutoText({ value, onSave, placeholder, label }: { value: string; onSave: (v: string) => void; placeholder: string; label: string }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [draft]);
  return (
    <textarea ref={ref} aria-label={label} value={draft} placeholder={placeholder} rows={2}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onSave(draft); }}
      onKeyDown={(e) => e.stopPropagation()}
      className="w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-border/50 bg-background/60 p-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/50" />
  );
}

/** Playable memo with editable transcript + AI summary and delete. Shared by notes and the library. */
export function VoiceMemoCard({ path, durationMs, memo: initial, onDeleted, onChange, footer }: {
  path: string; durationMs?: number; memo?: VoiceMemoRow | null;
  onDeleted?: () => void; onChange?: (m: VoiceMemoRow) => void; footer?: React.ReactNode;
}) {
  const [memo, setMemo] = useState<VoiceMemoRow | null>(initial ?? null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<"transcribe" | "summary" | "delete" | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "retranscribe" | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { if (initial) setMemo(initial); }, [initial]);
  useEffect(() => {
    if (!path || initial) return;
    let off = false;
    void ensureVoiceMemo(path, durationMs ?? 0).then((m) => { if (!off && m) setMemo(m); });
    return () => { off = true; };
  }, [path, initial, durationMs]);

  useEffect(() => {
    if (!path || !memo?.id) return;
    const ch = supabase.channel(`voice-memo-${memo.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "voice_memos", filter: `id=eq.${memo.id}` },
        (p) => setMemo(p.new as VoiceMemoRow))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [path, memo?.id]);

  useEffect(() => {
    if (!path) return;
    let off = false; setFailed(false);
    supabase.storage.from("note-audio").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (off) return; if (error || !data) setFailed(true); else setUrl(data.signedUrl);
    });
    const t = window.setTimeout(() => setNonce((n) => n + 1), 55 * 60 * 1000);
    return () => { off = true; clearTimeout(t); };
  }, [path, nonce]);

  const patch = async (p: Partial<VoiceMemoRow>) => {
    if (!memo) return;
    const next = { ...memo, ...p }; setMemo(next); onChange?.(next);
    try { await updateVoiceMemo(memo.id, p as any); } catch { toast.error("Couldn't save that change"); }
  };

  const transcribe = async () => {
    setBusy("transcribe");
    try {
      const text = await transcribeVoiceMemo(path);
      if (!text) { toast.message("No speech was found in this memo"); return; }
      await patch({ transcript: text, transcript_edited: false });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const summarize = async () => {
    if (!memo?.transcript?.trim()) { toast.message("Transcribe the memo first"); return; }
    setBusy("summary");
    try { await patch({ summary: await summarizeVoiceMemo(memo.id, memo.transcript) }); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const remove = async () => {
    setBusy("delete");
    try { await deleteVoiceMemo({ id: memo?.id, path }); toast.success("Voice memo deleted"); onDeleted?.(); }
    catch { toast.error("Couldn't delete this memo"); } finally { setBusy(null); }
  };

  const dur = memo?.duration_ms || durationMs || 0;
  const pill = "inline-flex min-h-9 items-center gap-1 rounded-full border border-border/60 px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60";
  return (
    <div className="rounded-xl border border-border/60 bg-card/75 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Mic className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">Voice memo</span>
        {dur ? <span>· {fmtMemoDuration(dur)}</span> : null}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" className={pill} disabled={!!busy}
            onClick={() => (memo?.transcript && memo.transcript_edited ? setConfirm("retranscribe") : void transcribe())}>
            {busy === "transcribe" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Type className="h-3.5 w-3.5" />}
            {busy === "transcribe" ? "Transcribing…" : memo?.transcript ? "Re-transcribe" : "Transcribe"}
          </button>
          <button type="button" className={pill} disabled={!!busy || !memo?.transcript} onClick={() => void summarize()}>
            {busy === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {memo?.summary ? "Re-summarize" : "Summarize"}
          </button>
          <button type="button" aria-label="Delete voice memo" title="Delete voice memo" disabled={!!busy}
            onClick={() => setConfirm("delete")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-60">
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {failed ? (
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCw className="h-3.5 w-3.5" /> Couldn't load audio — retry
        </button>
      ) : url ? (
        <audio controls preload="metadata" src={url} className="w-full" onError={() => setFailed(true)} />
      ) : <p className="text-xs text-muted-foreground">Loading…</p>}
      {memo?.transcript != null && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Transcript</p>
          <AutoText label="Transcript" value={memo.transcript ?? ""} placeholder="Transcript"
            onSave={(v) => void patch({ transcript: v, transcript_edited: true })} />
        </div>
      )}
      {memo?.summary != null && (
        <div className="mt-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">AI summary</p>
          <AutoText label="AI summary" value={memo.summary ?? ""} placeholder="Summary" onSave={(v) => void patch({ summary: v })} />
        </div>
      )}
      {footer}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? "Delete this voice memo?" : "Replace your edited transcript?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "delete" ? "The recording, transcript and summary will be removed for good." : "A new transcript will replace the edits you made."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const c = confirm; setConfirm(null); void (c === "delete" ? remove() : transcribe()); }}
              className={confirm === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>
              {confirm === "delete" ? "Delete" : "Replace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
