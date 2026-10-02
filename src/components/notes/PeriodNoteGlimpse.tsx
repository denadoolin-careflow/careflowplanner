import { useState, type ReactElement } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";
import { NoteMarkdownPreview } from "./NoteMarkdownPreview";

const cache = new Map<string, string>();

/** Hover glimpse of a daily/weekly/monthly note. Without a written note it just shows the trigger. */
export function PeriodNoteGlimpse({ noteId, written, label, children }: {
  noteId?: string; written?: boolean; label: string; children: ReactElement;
}) {
  const [text, setText] = useState<string | null>(noteId ? cache.get(noteId) ?? null : null);
  if (!noteId || !written) return children;
  const load = async (open: boolean) => {
    if (!open || cache.has(noteId)) return;
    const { data } = await supabase.from("notes").select("body").eq("id", noteId).maybeSingle();
    const t = data?.body ?? "";
    cache.set(noteId, t);
    setText(t);
  };
  return (
    <HoverCard openDelay={250} closeDelay={80} onOpenChange={o => void load(o)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-2 p-3 text-[11.5px] leading-relaxed">
        <p className="border-b border-border/60 pb-2 font-display font-semibold">{label}</p>
        <div className="max-h-72 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
          {text == null ? <p className="text-muted-foreground">Loading…</p> : <NoteMarkdownPreview body={text} maxChars={1800} />}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
