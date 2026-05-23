import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROMPTS = [
  "What matters most today?",
  "What will reduce stress tomorrow?",
  "What is actually urgent?",
  "What can be simplified?",
  "What would future me appreciate?",
];

export function DecisionSupport({ uid: _uid }: { uid: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [answer, setAnswer] = useState<{ prompt: string; text: string } | null>(null);

  async function ask(prompt: string) {
    setBusy(prompt); setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-mental-load", {
        body: { action: "decision_support", prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnswer({ prompt, text: data.text });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't think that through right now.");
    } finally { setBusy(null); }
  }

  return (
    <SectionCard
      title="Decision support"
      subtitle="Pick a question. Get one gentle answer."
      accent="warm"
    >
      <div className="flex flex-wrap gap-1.5">
        {PROMPTS.map((p) => (
          <button key={p} onClick={() => ask(p)} disabled={!!busy}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              busy === p
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card",
            )}>
            {busy === p ? <span className="inline-flex items-center"><Sparkles className="mr-1 h-3 w-3 animate-pulse" /> thinking…</span> : p}
          </button>
        ))}
      </div>
      {answer && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{answer.prompt}</p>
          {answer.text}
        </div>
      )}
    </SectionCard>
  );
}