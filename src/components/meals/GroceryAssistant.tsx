import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHIPS: { label: string; prompt: string; hint?: string }[] = [
  { label: "What can I make tonight?", prompt: "Suggest 3 dinners I can make from what's already in my pantry tonight.", hint: "pantry_meal_ideas" },
  { label: "Top up shopping list", prompt: "Look at my low and out-of-stock pantry items and suggest a quick shopping list.", hint: "low_stock" },
  { label: "Plan a budget week", prompt: "Plan a low-cost dinner-only week using pantry items where possible.", hint: "budget_week" },
  { label: "Use it up", prompt: "Which pantry items should I use this week before they go bad?", hint: "use_up" },
];

export function GroceryAssistant() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const ask = async (p: string, hint?: string) => {
    if (!p.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-grocery-assistant", {
        body: { prompt: p, hint },
      });
      if (error) throw error;
      if ((data as any)?.error === "credits_exhausted") {
        toast.error("AI credits exhausted. Add credits in workspace settings.");
        return;
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnswer((data as any)?.answer ?? "No answer.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't reach the assistant.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="rounded-full"
        onClick={() => setOpen(true)}>
        <Sparkles className="mr-1 h-3.5 w-3.5" />Ask grocery assistant
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />Grocery assistant
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setOpen(false); setAnswer(null); }}>
          Close
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map(c => (
          <button key={c.label} disabled={loading}
            onClick={() => ask(c.prompt, c.hint)}
            className="rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50">
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything about your pantry, meals, or grocery list…"
          rows={2}
          className="text-xs"
        />
        <Button size="sm" disabled={loading || !prompt.trim()} onClick={() => ask(prompt)}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ask"}
        </Button>
      </div>
      {answer && (
        <div className="whitespace-pre-wrap rounded-lg border border-border/40 bg-background/60 p-3 text-xs leading-relaxed text-foreground/90">
          {answer}
        </div>
      )}
    </div>
  );
}