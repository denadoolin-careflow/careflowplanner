import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ANCHORS, type AnchorMeta } from "@/lib/anchors";
import { SectionCard } from "@/components/cards/SectionCard";
import { cn } from "@/lib/utils";

interface AnchorFlow {
  anchor: AnchorMeta;
  count: number;
  pct: number;
}

/**
 * Shows how much recent activity flows into each anchor.
 * Counts completed tasks in the last 30 days grouped by tasks.anchor_key.
 */
export function AnchorFlowCard() {
  const [rows, setRows] = useState<AnchorFlow[]>(
    DEFAULT_ANCHORS.map((a) => ({ anchor: a, count: 0, pct: 0 })),
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("tasks")
        .select("anchor_key")
        .eq("user_id", user.id)
        .eq("done", true)
        .gte("updated_at", since);
      if (cancel || !data) return;
      const counts = new Map<string, number>();
      for (const r of data as { anchor_key: string | null }[]) {
        if (!r.anchor_key) continue;
        counts.set(r.anchor_key, (counts.get(r.anchor_key) ?? 0) + 1);
      }
      const max = Math.max(1, ...counts.values());
      setRows(
        DEFAULT_ANCHORS.map((a) => {
          const c = counts.get(a.key) ?? 0;
          return { anchor: a, count: c, pct: Math.round((c / max) * 100) };
        }),
      );
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <SectionCard
      title="My Anchors"
      subtitle="Where your attention has been flowing (last 30 days)"
      accent="sage"
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ anchor, count, pct }) => {
          const Icon = anchor.icon;
          return (
            <li
              key={anchor.key}
              className="rounded-2xl border border-border/60 bg-card/60 p-3"
            >
              <div className="flex items-center gap-2">
                <span className={cn("grid h-8 w-8 place-items-center rounded-xl", anchor.tint)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold leading-tight">{anchor.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{anchor.blurb}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn("h-full rounded-full", anchor.tint.split(" ")[0])}
                  style={{ width: `${pct}%` }}
                  aria-label={`${anchor.label} flow ${pct}%`}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
