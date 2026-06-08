import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { buildCareySnapshot } from "@/lib/carey/context";
import { CareyAvatar } from "./CareyAvatar";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CACHE_KEY = "carey:weekly-insights";

type Cached = { date: string; text: string };

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    if (!c?.date || !c?.text) return null;
    return c;
  } catch { return null; }
}

export function CareyInsightsWidget({ className }: { className?: string }) {
  const { state } = useStore();
  const snapshot = useMemo(() => buildCareySnapshot(state), [state]);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const cached = readCache();
    if (cached && cached.date === todayKey) { setText(cached.text); return; }
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(force: boolean) {
    if (loading) return;
    setLoading(true);
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
          contextType: "insights-weekly",
          contextSnapshot: snapshot,
          message: `Summarize my week and recommend 3 next actions based on my tasks, goals, and recent journaling.

Format STRICTLY as:

### This week
- one bullet per major theme (max 3)

### Momentum
- 1-2 short observations about goals & habits

### Recommended next actions
1. **Action title** — one sentence why
2. **Action title** — one sentence why
3. **Action title** — one sentence why

Keep it warm, specific, and under 180 words.`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Carey couldn't respond.");
      const t = data.text || "";
      setText(t);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayKey, text: t })); } catch { /* noop */ }
      if (force) toast.success("Insights refreshed");
    } catch (e: any) {
      toast.error(e?.message || "Carey couldn't load insights.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={cn(
      "rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-card/40 p-5",
      className,
    )}>
      <header className="flex items-center gap-2">
        <CareyAvatar size={28} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Carey's insights</p>
          <h3 className="font-display text-lg font-semibold leading-tight">This week, at a glance</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </header>

      <div className="mt-3 min-h-[120px]">
        {!text && loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your week…
          </div>
        )}
        {!text && !loading && (
          <p className="text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            Tap refresh to ask Carey what stands out this week.
          </p>
        )}
        {text && (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </section>
  );
}