import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Sprout, Star, Wand2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useCareProfile, SEASON_META, careHeaderForSeason } from "@/lib/care-methodology";
import { supabase } from "@/integrations/supabase/client";
import { loadTodayCheckin, saveCheckin } from "@/lib/mental-load";
import type { Task, Priority } from "@/lib/types";
import { toast } from "sonner";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function pickTopTasks(tasks: Task[], dateISO: string, n: number): Task[] {
  const candidates = tasks.filter(
    (t) => t.dueDate === dateISO && !t.parentTaskId && t.status !== "parked" && !t.done,
  );
  const scored = [...candidates].sort((a, b) => {
    if (!!b.isTopThree !== !!a.isTopThree) return b.isTopThree ? 1 : -1;
    const pa = PRIORITY_RANK[a.priority ?? "medium"];
    const pb = PRIORITY_RANK[b.priority ?? "medium"];
    if (pa !== pb) return pa - pb;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
  return scored.slice(0, n);
}

export function CarePriorities({ date, onTaskClick, collapsibleId }: { date: Date; onTaskClick?: (id: string) => void; collapsibleId?: string }) {
  const { state, toggleTask, updateTask } = useStore();
  const { profile } = useCareProfile();
  const lowMode = state.settings.lowEnergyMode;

  const [uid, setUid] = useState<string | null>(null);
  const [minMode, setMinMode] = useState(false);
  const [mvpChecked, setMvpChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancel) return;
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) {
        const c = await loadTodayCheckin(id);
        if (!cancel) setMinMode(!!c?.minimum_mode);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // Reset MVP checks when day changes
  const dateKey = format(date, "yyyy-MM-dd");
  useEffect(() => { setMvpChecked(new Set()); }, [dateKey]);

  const n = profile.top_n || 3;
  const seasonLabel = profile.season ? SEASON_META[profile.season].label : "Stabilizing";
  const top = useMemo(() => pickTopTasks(state.tasks, dateKey, n), [state.tasks, dateKey, n]);
  const gentle = minMode || lowMode;

  const toggleMvp = (i: number) => {
    setMvpChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const onActivateGentle = async (next: boolean) => {
    setMinMode(next);
    if (!uid) return;
    try {
      await saveCheckin(uid, { minimum_mode: next });
      toast.success(next ? "Today is gentle. The rest can wait." : "Welcome back to a fuller day.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    }
  };

  const mvp = (profile.mvp_items?.length ? profile.mvp_items : []) as string[];

  const doneCount = top.filter((t) => t.done).length;
  const preview = gentle
    ? `${mvpChecked.size}/${mvp.length} kept`
    : top.length
      ? `${doneCount}/${top.length} complete`
      : "Pick priorities";

  return (
    <SectionCard
      title={gentle ? "Minimum viable day" : `Top ${n} for today`}
      subtitle={gentle ? "What you'd be proud of, even on the heaviest day." : careHeaderForSeason(profile.season)}
      accent={gentle ? "sage" : "warm"}
      collapsibleId={collapsibleId}
      collapsedPreview={preview}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
            {seasonLabel}
          </Badge>
          <Button
            size="sm"
            variant={gentle ? "default" : "outline"}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onActivateGentle(!minMode)}
            title="Toggle gentle / minimum-viable mode"
          >
            <Wand2 className="mr-1 h-3.5 w-3.5" />
            {gentle ? "Gentle mode on" : "Gentle mode"}
          </Button>
        </div>
      }
    >
      {gentle ? (
        <div className="space-y-2">
          {mvp.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              You haven't set your minimum viable day yet.{" "}
              <a href="/mental-load" className="text-primary underline-offset-4 hover:underline">
                Set it up <ArrowRight className="inline h-3 w-3" />
              </a>
            </div>
          )}
          {mvp.map((item, i) => {
            const done = mvpChecked.has(i);
            return (
              <button
                key={`${i}-${item}`}
                type="button"
                onClick={() => toggleMvp(i)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3 text-left transition",
                  "hover:border-primary/30 hover:bg-card/80",
                  done && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    done ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-background/60",
                  )}
                >
                  <Sprout
                    className={cn(
                      "h-3.5 w-3.5",
                      done ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground",
                    )}
                  />
                </span>
                <span className={cn("text-sm", done && "line-through")}>{item}</span>
              </button>
            );
          })}
          <p className="pt-1 text-xs text-muted-foreground">
            This is enough. The rest of today can wait.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {top.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              No priorities chosen yet. Star up to {n} tasks for today, or drag them from the rail.
            </div>
          )}
          {top.map((t, idx) => (
            <div
              key={t.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3 transition",
                "hover:border-primary/30 hover:bg-card/80",
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {idx + 1}
              </span>
              <Checkbox
                checked={t.done}
                onCheckedChange={() => toggleTask(t.id)}
                aria-label={`Complete ${t.title}`}
              />
              <button
                type="button"
                className="flex-1 truncate text-left text-sm"
                onClick={() => onTaskClick?.(t.id)}
              >
                {t.title}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                onClick={() => updateTask(t.id, { isTopThree: !t.isTopThree })}
                title={t.isTopThree ? "Unpin priority" : "Pin as priority"}
              >
                <Star className={cn("h-4 w-4", t.isTopThree && "fill-amber-400 text-amber-500")} />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Anchor your day in {n} intentional moves.
            </span>
            <span>{top.filter((t) => t.done).length}/{top.length} complete</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
