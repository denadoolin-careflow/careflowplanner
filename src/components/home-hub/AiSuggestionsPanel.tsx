import { useState } from "react";
import { Sparkles, Plus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";

export interface MaintenanceSuggestion {
  title: string;
  category: string;
  interval_months: number;
  reason: string;
}

export interface RhythmSuggestion {
  morning: string[];
  afternoon: string[];
  evening: string[];
  night: string[];
  encouragement: string;
}

interface BaseProps {
  mode: "maintenance" | "rhythm";
  context: Record<string, unknown>;
}

export function useAiSuggest<T>() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const run = async (mode: "maintenance" | "rhythm", context: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data: res, error } = await aiInvoke("ai-home-assistant", {
        body: { mode, context },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as T);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI suggestion failed");
    } finally {
      setLoading(false);
    }
  };

  return { loading, data, setData, run };
}

export function AiPanelShell({
  title, loading, hasData, onRun, onClose, children, runLabel = "Get AI suggestions",
}: {
  title: string; loading: boolean; hasData: boolean;
  onRun: () => void; onClose: () => void; children: React.ReactNode; runLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 to-card/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={onRun} disabled={loading}>
            <RefreshCw className={cn("mr-1 h-3 w-3", loading && "animate-spin")} />
            {loading ? "Thinking…" : hasData ? "Refresh" : runLabel}
          </Button>
          {hasData && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {!hasData && !loading && (
        <p className="text-xs text-muted-foreground">Tap above for a calm, personalized list. Nothing is saved unless you add it.</p>
      )}
      {children}
    </div>
  );
}

export function MaintenanceSuggestionList({
  items, onAccept,
}: {
  items: MaintenanceSuggestion[];
  onAccept: (s: MaintenanceSuggestion) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, idx) => (
        <li key={idx} className="flex flex-wrap items-center gap-2 rounded-xl bg-card/80 px-3 py-2 text-sm">
          <div className="flex-1 min-w-[180px]">
            <div className="font-medium">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {s.category} · {s.interval_months > 0 ? `every ${s.interval_months} mo` : "one-off"} · {s.reason}
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={() => onAccept(s)}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function RhythmSuggestionList({
  data, onAccept,
}: {
  data: RhythmSuggestion;
  onAccept: (slot: "morning" | "afternoon" | "evening" | "night", title: string) => void;
}) {
  const slots: Array<["morning" | "afternoon" | "evening" | "night", string]> = [
    ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night Reset"],
  ];
  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-card/60 px-3 py-2 text-xs italic text-muted-foreground">"{data.encouragement}"</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {slots.map(([key, label]) => (
          <div key={key} className="rounded-xl border border-border/50 bg-card/60 p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <ul className="space-y-1">
              {(data[key] ?? []).map((t, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAccept(key, t)}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                    aria-label="Add to rhythm"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="text-xs">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}