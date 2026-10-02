import { useState, type ReactElement } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

function excerpt(body: string) {
  return body
    .split("\n")
    .map(l => l.replace(/^\s*#{1,6}\s*/, "").replace(/^\s*[-*]\s*(\[[ x]\]\s*)?/, "").replace(/[*_`>]/g, "").trim())
    .filter(Boolean)
    .join(" · ")
    .slice(0, 260);
}

/** Hover glimpse of a daily/weekly/monthly note. Without a written note it just shows the trigger. */
export function PeriodNoteGlimpse({ noteId, written, label, children }: {
  noteId?: string; written?: boolean; label: string; children: ReactElement;
}) {
  const [text, setText] = useState<string | null>(noteId ? cache.get(noteId) ?? null : null);
  if (!noteId || !written) return children;
  const load = async (open: boolean) => {
    if (!open || cache.has(noteId)) return;
    const { data } = await supabase.from("notes").select("body").eq("id", noteId).maybeSingle();
    const t = excerpt(data?.body ?? "") || "Nothing written yet.";
    cache.set(noteId, t);
    setText(t);
  };
  return (
    <HoverCard openDelay={250} closeDelay={80} onOpenChange={o => void load(o)}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 space-y-1 text-[11.5px] leading-relaxed">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground [overflow-wrap:anywhere]">{text ?? "Loading…"}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
