/** Normalize AI output so paragraphs, headings, and lists always have a
 *  blank line between them — markdown renderers (and our tiptap editor)
 *  need the empty line to separate block elements. */
function normalizeMarkdown(raw: string): string {
  let t = raw.replace(/\r\n/g, "\n").trim();
  // Strip stray triple-backtick wrappers the model sometimes adds.
  t = t.replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i, "$1");
  // Collapse 3+ blank lines to exactly one blank line.
  t = t.replace(/\n{3,}/g, "\n\n");
  // Ensure a blank line before headings, list items, and blockquotes when
  // they follow a non-empty line.
  t = t.replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2");
  t = t.replace(/([^\n])\n([-*+] |\d+\. |> )/g, "$1\n\n$2");
  return t.trim();
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Lightbulb, Wand2, FileText, ListPlus, ArrowDownToLine, PencilLine, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";

type Action = "ideas" | "prompts" | "summarize" | "expand" | "polish" | "continue" | "custom";

const QUICK: { action: Action; label: string; Icon: any; mode: "replace" | "append" }[] = [
  { action: "ideas", label: "Brainstorm ideas", Icon: Lightbulb, mode: "append" },
  { action: "prompts", label: "Writing prompts", Icon: ListPlus, mode: "append" },
  { action: "continue", label: "Continue writing", Icon: ArrowDownToLine, mode: "append" },
  { action: "expand", label: "Expand & flesh out", Icon: Wand2, mode: "replace" },
  { action: "polish", label: "Polish & edit", Icon: PencilLine, mode: "replace" },
  { action: "summarize", label: "Summarize", Icon: FileText, mode: "append" },
];

interface Props {
  title: string;
  body: string;
  onApply: (next: string) => void;
}

export function NoteAIButton({ title, body, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [instr, setInstr] = useState("");

  async function run(action: Action, mode: "replace" | "append", instruction?: string) {
    setBusy(action);
    try {
      const { data, error } = await aiInvoke("ai-notes", {
        body: { action, title, body, instruction },
      });
      if (error) throw error;
      const raw = (data as any)?.text?.trim();
      if (!raw) throw new Error("Empty response");
      const text = normalizeMarkdown(raw);
      const next = mode === "replace"
        ? text
        : (body ? `${body.replace(/\s+$/, "")}\n\n${text}\n` : text);
      onApply(next);
      toast.success("AI updated your note");
      setOpen(false);
      setInstr("");
    } catch (e: any) {
      toast.error(e?.message || "AI request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> AI
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          AI assistant
        </div>
        <div className="flex flex-col gap-0.5">
          {QUICK.map(({ action, label, Icon, mode }) => (
            <button
              key={action}
              type="button"
              disabled={!!busy}
              onClick={() => run(action, mode)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted disabled:opacity-50"
            >
              {busy === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              <span>{label}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">{mode}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Custom instruction</div>
          <div className="flex items-center gap-1.5 px-1">
            <Input
              value={instr}
              onChange={e => setInstr(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && instr.trim()) run("custom", "replace", instr.trim()); }}
              placeholder="e.g. make it more concise"
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              disabled={!instr.trim() || !!busy}
              onClick={() => run("custom", "replace", instr.trim())}
              className="h-8"
            >
              {busy === "custom" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}