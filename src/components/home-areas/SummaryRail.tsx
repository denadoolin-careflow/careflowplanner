import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronRight, FileText, Wrench, AlertTriangle } from "lucide-react";

const KEY = "careflow:home-areas:rail-collapsed";
const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  uid: string;
  onOpenSection?: (id: "maintenance" | "documents") => void;
  /** Called with the current urgent maintenance count so the nav can badge it. */
  onUrgentCount?: (n: number) => void;
}

/** Right-hand summary rail with progress, next-due maintenance, and recent docs.
 *  Collapsible; state persisted to localStorage. */
export function SummaryRail({ uid, onOpenSection, onUrgentCount }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [maint, setMaint] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [tasksRes, maintRes, docsRes] = await Promise.all([
        supabase.from("cleaning_tasks").select("id, done").eq("user_id", uid),
        supabase.from("home_maintenance")
          .select("id, title, next_due, category")
          .eq("user_id", uid)
          .order("next_due", { nullsFirst: false })
          .limit(3),
        supabase.from("home_documents")
          .select("id, title, category, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);
      if (cancelled) return;
      const tasks = tasksRes.data ?? [];
      setProgress({ done: tasks.filter((t: any) => t.done).length, total: tasks.length });
      const m = maintRes.data ?? [];
      setMaint(m);
      const t = today();
      onUrgentCount?.(m.filter((x: any) => x.next_due && x.next_due <= t).length);
      setDocs(docsRes.data ?? []);
    }
    load();
    return () => { cancelled = true; };
  }, [uid, onUrgentCount]);

  if (collapsed) {
    return (
      <aside className="hidden xl:flex w-10 shrink-0 border-l border-border/60 bg-card/40">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex w-full items-start justify-center pt-6 text-muted-foreground hover:text-foreground"
          aria-label="Expand summary"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      </aside>
    );
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const t = today();

  return (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col gap-8 border-l border-border/60 bg-card/40 p-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          At a glance
        </h4>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Collapse summary"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section>
        <h5 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Today's progress
        </h5>
        <div className="rounded-2xl bg-muted/40 p-4">
          <div className="mb-2 flex items-end justify-between">
            <span className="font-display text-2xl font-bold text-primary">{pct}%</span>
            <span className="mb-1 text-xs text-muted-foreground">
              {progress.done} of {progress.total} tasks
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Upcoming maintenance
          </h5>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onClick={() => onOpenSection?.("maintenance")}
          >
            View
          </button>
        </div>
        {maint.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
        ) : (
          <div className="space-y-3">
            {maint.slice(0, 2).map((m) => {
              const overdue = m.next_due && m.next_due <= t;
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                  )}>
                    {overdue ? <AlertTriangle className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{m.title}</p>
                    <p className={cn(
                      "text-xs font-medium",
                      overdue ? "text-destructive" : "text-muted-foreground",
                    )}>
                      {m.next_due ? (overdue ? `Overdue · ${m.next_due}` : `Due ${m.next_due}`) : "No due date"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Recent documents
          </h5>
          <button
            type="button"
            className="text-[11px] text-primary hover:underline"
            onClick={() => onOpenSection?.("documents")}
          >
            View
          </button>
        </div>
        {docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-accent/40"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                  {d.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}