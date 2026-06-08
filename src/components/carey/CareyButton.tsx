import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Sparkles } from "lucide-react";
import { CareyAvatar } from "./CareyAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type Action = { label: string; prompt: string };

export type CareyButtonProps = {
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  actions: Action[];
  context: Record<string, unknown>;
  contextType?: string;
  contextId?: string;
  className?: string;
};

export function CareyButton({
  label = "Ask Carey",
  variant = "outline",
  size = "sm",
  actions,
  context,
  contextType,
  contextId,
  className,
}: CareyButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  async function run(action: Action) {
    setLoading(true);
    setActiveLabel(action.label);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/carey-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: action.prompt,
          contextSnapshot: context,
          contextType,
          contextId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Carey couldn't respond.");
      setResult(data.text || "");
    } catch (e: any) {
      toast.error(e?.message || "Carey couldn't respond.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); setActiveLabel(null); } }}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={cn("gap-1.5", className)}>
          <Sparkles className="h-3.5 w-3.5" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <CareyAvatar size={28} />
          <span className="text-sm font-medium">Carey</span>
        </div>
        {!result && !loading && (
          <div className="space-y-0.5 p-1.5">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={() => run(a)}
                className="block w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {activeLabel ?? "Thinking…"}
          </div>
        )}
        {result && (
          <div className="max-h-[60vh] overflow-y-auto p-3">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{activeLabel}</p>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setResult(null); setActiveLabel(null); }}>Back</Button>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied"); }}>Copy</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}