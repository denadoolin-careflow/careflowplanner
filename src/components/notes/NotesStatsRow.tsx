import { useMemo } from "react";
import {
  BookOpenText, CalendarPlus, Flame, Hash, Sparkles, TrendingUp,
} from "lucide-react";
import { differenceInCalendarDays, parseISO, startOfWeek, subDays } from "date-fns";
import { fallbackColorFor, type Tag } from "@/lib/tags";
import type { Note } from "@/lib/notes";

export function NotesStatsRow({ notes, tags }: { notes: Note[]; tags: Tag[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const lastWeekStart = subDays(now, 14).getTime();
    const thisWeek = notes.filter(n => parseISO(n.updatedAt).getTime() >= weekStart).length;
    const lastWeek = notes.filter(n => {
      const t = parseISO(n.updatedAt).getTime();
      return t >= lastWeekStart && t < weekStart;
    }).length;
    const total = notes.length;
    const delta = thisWeek - lastWeek;

    // Writing streak — consecutive days back from today with at least one updated note.
    const dayKeys = new Set(notes.map(n => parseISO(n.updatedAt).toISOString().slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = subDays(now, i).toISOString().slice(0, 10);
      if (dayKeys.has(d)) streak++;
      else if (i > 0) break;
      else streak = 0;
    }

    // Daily average over last 30 days
    const since = subDays(now, 30).getTime();
    const last30 = notes.filter(n => parseISO(n.updatedAt).getTime() >= since).length;
    const avg = (last30 / 30).toFixed(1);

    // Most used tag
    const counts = new Map<string, number>();
    for (const n of notes) for (const t of n.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let topTag: string | null = null; let topCount = 0;
    counts.forEach((v, k) => { if (v > topCount) { topCount = v; topTag = k; } });
    const topColor = topTag ? (tags.find(t => t.name.toLowerCase() === topTag!.toLowerCase())?.color || fallbackColorFor(topTag)) : null;

    // Recent (created this week)
    const newThisWeek = notes.filter(n => parseISO(n.createdAt).getTime() >= weekStart).length;

    return { total, thisWeek, delta, streak, avg, topTag, topCount, topColor, newThisWeek };
  }, [notes, tags]);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total notes" value={stats.total} icon={BookOpenText} accent="from-amber-100/60 to-orange-100/40" />
      <StatCard
        label="This week"
        value={stats.thisWeek}
        icon={TrendingUp}
        accent="from-rose-100/60 to-amber-100/40"
        sub={stats.delta === 0 ? "Steady" : stats.delta > 0 ? `+${stats.delta} vs last` : `${stats.delta} vs last`}
      />
      <StatCard
        label="Streak"
        value={`${stats.streak}d`}
        icon={Flame}
        accent="from-orange-100/60 to-rose-100/40"
        sub={stats.streak > 0 ? "Keep going" : "Start today"}
      />
      <StatCard
        label="Daily avg (30d)"
        value={stats.avg}
        icon={Sparkles}
        accent="from-violet-100/60 to-rose-100/40"
      />
      <StatCard
        label="Top tag"
        value={stats.topTag ?? "—"}
        icon={Hash}
        accent="from-emerald-100/60 to-teal-100/40"
        sub={stats.topTag ? `${stats.topCount} notes` : "No tags yet"}
        valueColor={stats.topColor ?? undefined}
      />
      <StatCard
        label="New this week"
        value={stats.newThisWeek}
        icon={CalendarPlus}
        accent="from-sky-100/60 to-violet-100/40"
      />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, accent, sub, valueColor,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${accent} p-3 shadow-soft`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/65">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div
        className="mt-1.5 font-display text-xl font-semibold leading-tight truncate"
        style={valueColor ? { color: valueColor } : undefined}
        title={String(value)}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-foreground/60">{sub}</div>}
    </div>
  );
}