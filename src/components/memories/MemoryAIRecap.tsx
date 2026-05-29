import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Memory } from "@/lib/memories";
import { aiInvoke } from "@/lib/ai-invoke";

export function MemoryAIRecap({ memories, scopeLabel }: { memories: Memory[]; scopeLabel: string }) {
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (memories.length === 0) { toast.info("No memories yet to summarize."); return; }
    setLoading(true);
    try {
      const compact = memories.slice(0, 60).map((m) => ({
        date: m.date, type: m.memoryType, title: m.title,
        mood: m.mood, location: m.location,
        description: m.description?.slice(0, 200),
        beautiful: m.beautifulNote?.slice(0, 100),
        challenging: m.challengingNote?.slice(0, 100),
        tags: m.tags?.slice(0, 5),
      }));
      const { data, error } = await aiInvoke("ai-memory-recap", {
        body: { scope: scopeLabel, memories: compact },
      });
      if (error) throw error;
      setRecap(data?.recap ?? "");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate recap");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-3xl border border-[hsl(350_45%_85%/0.6)] bg-gradient-to-br from-[hsl(20_70%_97%)] via-[hsl(350_60%_97%)] to-[hsl(350_45%_94%)] p-5 shadow-[0_4px_30px_-15px_hsl(350_60%_40%/0.3)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[hsl(350_45%_45%)]">Gentle reflection</div>
          <div className="font-display text-lg">{scopeLabel}</div>
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="border-[hsl(350_45%_70%)] bg-white/60">
          {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          {recap ? "Regenerate" : "Generate recap"}
        </Button>
      </div>
      {recap && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{recap}</p>
      )}
      {!recap && !loading && (
        <p className="mt-3 text-sm italic text-muted-foreground">
          Let AI weave a soft narrative from your {memories.length} {memories.length === 1 ? "memory" : "memories"}.
        </p>
      )}
    </div>
  );
}