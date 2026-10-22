import { useState } from "react";
import { Loader2, MoonStar, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";
import type { NoteProperty } from "@/lib/notes";
import { hasRhythm, loadCycleInput, mergeRhythm, rhythmDateFor, rhythmPropertiesFor, SUMMARY_PROP_ID } from "@/lib/notes/rhythm-properties";

const btn = "inline-flex min-h-[36px] items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-50";

export function SmartPropertyActions({ value, onChange, noteDate, createdAt, title = "", body = "" }: {
  value: NoteProperty[]; onChange: (next: NoteProperty[]) => void;
  noteDate?: string | null; createdAt?: string; title?: string; body?: string;
}) {
  const [busy, setBusy] = useState<"rhythm" | "ai" | null>(null);
  const stamped = hasRhythm(value);

  const stamp = async () => {
    setBusy("rhythm");
    try {
      const { data } = await supabase.auth.getUser();
      const cycle = data.user ? await loadCycleInput(data.user.id) : null;
      onChange(mergeRhythm(value, rhythmPropertiesFor(rhythmDateFor(noteDate, createdAt), cycle), true));
    } finally { setBusy(null); }
  };

  const summarize = async () => {
    if (!body.trim()) { toast("Write something first, then summarize."); return; }
    setBusy("ai");
    try {
      const { data, error, quotaExceeded } = await aiInvoke("ai-notes", { body: { action: "summary", title, body } });
      if (quotaExceeded) return;
      if (error) throw new Error(error?.error || error?.message || "AI summary failed");
      const text = String((data as any)?.text ?? "").trim();
      if (!text) throw new Error("AI returned an empty summary");
      const prop: NoteProperty = { id: SUMMARY_PROP_ID, name: "Summary", type: "text", value: text };
      onChange(value.some(p => p.id === SUMMARY_PROP_ID) ? value.map(p => p.id === SUMMARY_PROP_ID ? { ...p, value: text } : p) : [...value, prop]);
      toast.success("Summary added");
    } catch (e: any) {
      toast.error(e?.message || "AI summary failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={btn} disabled={!!busy} onClick={stamp}>
        {busy === "rhythm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : stamped ? <RefreshCw className="h-3.5 w-3.5" /> : <MoonStar className="h-3.5 w-3.5" />}
        {stamped ? "Refresh rhythm" : "Add rhythm details"}
      </button>
      <button type="button" className={btn} disabled={!!busy} onClick={summarize}>
        {busy === "ai" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {value.some(p => p.id === SUMMARY_PROP_ID) ? "Refresh AI summary" : "Summarize with AI"}
      </button>
    </div>
  );
}
