import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Sparkles, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { aiInvoke } from "@/lib/ai-invoke";
import { Button } from "@/components/ui/button";
import { NoteMarkdown } from "./NoteMarkdown";
import { hasWriting } from "@/lib/notes/daily";
import { periodTitle, spanFor, toISO } from "@/lib/notes/periods";
import type { Note } from "@/lib/notes";

/** Gathers every note written in this week/month and asks AI for one rollup summary. */
export function PeriodRollup({ note }: { note: Note }) {
  const kind = note.kind as "weekly" | "monthly";
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [count, setCount] = useState(0);

  const run = async () => {
    setBusy(true);
    try {
      const span = spanFor(kind, note.date!);
      const from = toISO(span.from), to = toISO(span.to);
      const [{ data: dated }, { data: loose }] = await Promise.all([
        supabase.from("notes").select("id,title,body,kind,date").gte("date", from).lte("date", to).eq("archived", false).order("date"),
        supabase.from("notes").select("id,title,body,kind,date,created_at").is("date", null).eq("archived", false)
          .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`).order("created_at").limit(60),
      ]);
      const rows = [...(dated ?? []), ...(loose ?? [])].filter((r: any) => r.id !== note.id && hasWriting(r.body ?? ""));
      if (!rows.length) { toast.info(`No notes written this ${kind === "weekly" ? "week" : "month"} yet`); return; }
      const body = rows.map((r: any) => {
        const day = r.date ?? r.created_at?.slice(0, 10);
        return `## ${day ? format(new Date(`${day}T12:00:00`), "EEE MMM d") : ""} · ${r.kind === "daily" ? "Daily note" : r.title || "Note"}\n${String(r.body).slice(0, 4000)}`;
      }).join("\n\n");
      const { data, error } = await aiInvoke("ai-notes", { body: { action: "rollup", title: periodTitle(kind, note.date!), body } });
      if (error) throw new Error(error?.error || error?.message || "Summary failed");
      const out = String((data as any)?.text ?? "").trim();
      if (!out) throw new Error("The summary came back empty");
      setText(out); setCount(rows.length);
    } catch (e: any) { toast.error(e?.message ?? "Couldn't summarize"); }
    finally { setBusy(false); }
  };

  const insert = () => {
    const heading = `## ${kind === "weekly" ? "Week" : "Month"} summary`;
    window.dispatchEvent(new CustomEvent("careflow:insert-into-note", { detail: { markdown: `${heading}\n\n${text}`, at: "end" } }));
    toast.success("Added to this note");
    setText("");
  };

  return (
    <section className="mt-4 rounded-2xl border border-border/60 bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> {kind === "weekly" ? "Week" : "Month"} summary
        </h3>
        <Button size="sm" variant="ghost" className="ml-auto h-9 gap-1 text-xs" disabled={busy} onClick={() => void run()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {text ? "Redo" : "Summarize all notes"}
        </Button>
      </div>
      {!text && !busy && (
        <p className="mt-1 text-xs text-muted-foreground">
          Reads every note from this {kind === "weekly" ? "week" : "month"} and pulls out themes, wins, what was hard and next steps.
        </p>
      )}
      {text && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground">From {count} note{count === 1 ? "" : "s"}</p>
          <div className="rounded-xl bg-muted/40 p-3 text-sm"><NoteMarkdown body={text} /></div>
          <div className="flex gap-2">
            <Button size="sm" className="h-9 gap-1" onClick={insert}><Plus className="h-3.5 w-3.5" /> Add to note</Button>
            <Button size="sm" variant="ghost" className="h-9 gap-1" onClick={() => setText("")}><X className="h-3.5 w-3.5" /> Dismiss</Button>
          </div>
        </div>
      )}
    </section>
  );
}
