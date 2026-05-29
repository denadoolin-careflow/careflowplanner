import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { NoteMarkdown } from "@/components/notes/NoteMarkdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";

const CACHE_KEY = "projects.ai-summary.v1";
type Cached = { overview: string; updatedAt: string };

export function ProjectsAISummary({ projectCount }: { projectCount: number }) {
  const [data, setData] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await aiInvoke("ai-projects-summary", { body: {} });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      const next: Cached = { overview: (res as any).overview, updatedAt: (res as any).updated_at };
      setData(next);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
      toast.success("Project briefing updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate briefing");
    } finally {
      setLoading(false);
    }
  };

  if (projectCount === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card/60 to-accent/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-left"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI project briefing</div>
            <div className="text-[11px] text-muted-foreground">
              {data ? `Updated ${new Date(data.updatedAt).toLocaleString()}` : "Get a warm summary across all your active projects"}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="h-8 gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="text-xs">{data ? "Refresh" : "Generate"}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOpen(o => !o)} aria-label="Toggle">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {open && data && (
        <div className="mt-3 rounded-xl bg-background/50 p-3 text-sm leading-relaxed">
          <NoteMarkdown body={data.overview} />
        </div>
      )}
      {open && !data && (
        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-background/40 p-4 text-center text-xs text-muted-foreground">
          Tap <span className="font-medium text-foreground">Generate</span> for a warm overview of recent wins and gentle next steps across every active project.
        </div>
      )}
    </section>
  );
}