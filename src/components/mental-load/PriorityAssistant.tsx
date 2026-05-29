import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Clock, Users, Leaf } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";

type Item = { id: string; title: string; reason?: string };
type Result = {
  headline: string;
  buckets: {
    most_important: Item[];
    can_wait: Item[];
    delegate: Item[];
    low_energy: Item[];
  };
};

const BUCKETS = [
  { key: "most_important", label: "Most important", icon: Star,  tone: "border-primary/40 bg-primary/8" },
  { key: "low_energy",     label: "Low-energy wins", icon: Leaf, tone: "border-emerald-500/40 bg-emerald-500/8" },
  { key: "delegate",       label: "Could delegate",  icon: Users, tone: "border-amber-500/40 bg-amber-500/8" },
  { key: "can_wait",       label: "Can wait — truly", icon: Clock, tone: "border-muted bg-muted/30" },
] as const;

export function PriorityAssistant({ uid: _uid, refreshKey }: { uid: string; refreshKey?: number }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    try {
      const { data, error } = await aiInvoke("ai-mental-load", {
        body: { action: "prioritize" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't think clearly right now.");
    } finally { setBusy(false); }
  }

  return (
    <SectionCard
      title="Gentle prioritization"
      subtitle="A soft sort of what's on your plate — never a verdict."
      accent="calm"
      action={
        <Button size="sm" onClick={run} disabled={busy}>
          <Sparkles className={cn("mr-1 h-3.5 w-3.5", busy && "animate-pulse")} />
          {busy ? "Thinking…" : result ? "Re-sort" : "Sort my day"}
        </Button>
      }
    >
      {!result && !busy && (
        <p className="text-sm text-muted-foreground">
          When you're ready, I'll look at today's list and your check-in, and gently sort what matters most.
        </p>
      )}
      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm italic">
            "{result.headline}"
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUCKETS.map((b) => {
              const items = (result.buckets as any)[b.key] as Item[];
              const Icon = b.icon;
              return (
                <div key={b.key} className={cn("rounded-xl border p-3", b.tone)}>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="h-3.5 w-3.5" /> {b.label}
                    <span className="text-muted-foreground">· {items?.length ?? 0}</span>
                  </div>
                  {items?.length ? (
                    <ul className="space-y-1 text-sm">
                      {items.map((it) => (
                        <li key={it.id} className="leading-snug">
                          <span className="block">{it.title}</span>
                          {it.reason && <span className="block text-[11px] text-muted-foreground">{it.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Nothing here right now.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}