import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Heart, Activity, Brain, Moon, Droplet, Sparkles, Flower2, NotebookPen,
} from "lucide-react";

type Event = {
  id: string;
  date: string;
  kind: "checkin" | "mental" | "movement" | "sleep" | "ritual" | "cycle" | "review";
  title: string;
  emotions?: string[];
  intention?: string;
  outcome?: string;
  meta?: { label: string; value: string }[];
  notes?: string;
};

const KIND_META: Record<Event["kind"], { label: string; color: string; icon: any }> = {
  checkin:  { label: "Check-in",   color: "hsl(340 50% 60%)", icon: Heart },
  mental:   { label: "Mental",     color: "hsl(265 45% 62%)", icon: Brain },
  movement: { label: "Movement",   color: "hsl(145 45% 50%)", icon: Activity },
  sleep:    { label: "Sleep",      color: "hsl(220 45% 55%)", icon: Moon },
  ritual:   { label: "Ritual",     color: "hsl(195 50% 55%)", icon: Droplet },
  cycle:    { label: "Cycle",      color: "hsl(15 60% 60%)",  icon: Flower2 },
  review:   { label: "Reflection", color: "hsl(40 60% 55%)",  icon: NotebookPen },
};

function prettyDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function TimelinePage({ uid }: { uid: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [filter, setFilter] = useState<"all" | Event["kind"]>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);

      const [ci, mh, mv, sl, wr, cy, dr] = await Promise.all([
        supabase.from("health_checkins").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("mental_health_logs").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("movement_logs").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("sleep_logs").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("wellness_rituals").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("cycle_day_logs").select("*").eq("user_id", uid).gte("date", sinceStr),
        supabase.from("daily_reviews").select("*").eq("user_id", uid).gte("date", sinceStr),
      ]);

      const evs: Event[] = [];

      (ci.data ?? []).forEach((r: any) => evs.push({
        id: "ci-" + r.id, date: r.date, kind: "checkin",
        title: `Feeling ${r.mood ?? "—"}`,
        meta: [
          r.mood && { label: "Mood", value: r.mood },
          r.stress && { label: "Stress", value: r.stress },
          r.sleep_hours != null && { label: "Sleep", value: `${r.sleep_hours}h` },
          r.water_cups != null && { label: "Water", value: `${r.water_cups} cups` },
          r.mindfulness_minutes != null && { label: "Mindful", value: `${r.mindfulness_minutes}m` },
        ].filter(Boolean) as any,
        notes: r.notes,
      }));

      (mh.data ?? []).forEach((r: any) => evs.push({
        id: "mh-" + r.id, date: r.date, kind: "mental",
        title: r.intention ? `Intention: ${r.intention}` : "Mental health log",
        emotions: Array.isArray(r.emotions) ? r.emotions : (r.emotions ? Object.values(r.emotions) : []),
        intention: r.intention,
        outcome: r.gratitude || r.support_needed,
        meta: [
          r.mood != null && { label: "Mood", value: String(r.mood) },
          r.anxiety != null && { label: "Anxiety", value: String(r.anxiety) },
          r.focus != null && { label: "Focus", value: String(r.focus) },
        ].filter(Boolean) as any,
        notes: r.notes,
      }));

      (mv.data ?? []).forEach((r: any) => evs.push({
        id: "mv-" + r.id, date: r.date, kind: "movement",
        title: r.activity || "Movement",
        meta: [
          r.minutes != null && { label: "Minutes", value: String(r.minutes) },
          r.intensity && { label: "Intensity", value: r.intensity },
        ].filter(Boolean) as any,
        notes: r.notes,
      }));

      (sl.data ?? []).forEach((r: any) => evs.push({
        id: "sl-" + r.id, date: r.date, kind: "sleep",
        title: `Slept ${r.hours_slept ?? "—"}h`,
        meta: [
          r.quality != null && { label: "Quality", value: `${r.quality}/5` },
          r.bedtime && { label: "Bed", value: r.bedtime },
          r.wake_time && { label: "Wake", value: r.wake_time },
        ].filter(Boolean) as any,
        notes: r.dreams,
      }));

      (wr.data ?? []).forEach((r: any) => evs.push({
        id: "wr-" + r.id, date: r.date, kind: "ritual",
        title: `${r.ritual_type ?? "Ritual"}${r.amount ? ` · ${r.amount}` : ""}`,
        meta: r.duration_minutes != null ? [{ label: "Duration", value: `${r.duration_minutes}m` }] : [],
      }));

      (cy.data ?? []).forEach((r: any) => evs.push({
        id: "cy-" + r.id, date: r.date, kind: "cycle",
        title: r.flow ? `Flow: ${r.flow}` : "Cycle log",
        meta: [
          r.mood && { label: "Mood", value: r.mood },
          r.energy_level && { label: "Energy", value: r.energy_level },
          r.symptoms?.length && { label: "Symptoms", value: r.symptoms.join(", ") },
        ].filter(Boolean) as any,
        notes: r.notes,
      }));

      (dr.data ?? []).forEach((r: any) => evs.push({
        id: "dr-" + r.id, date: r.date, kind: "review",
        title: "Daily reflection",
        outcome: r.wins,
        intention: r.tomorrow_focus,
        meta: [
          r.rating != null && { label: "Rating", value: `${r.rating}/10` },
        ].filter(Boolean) as any,
        notes: [r.gratitude, r.lessons, r.challenges].filter(Boolean).join(" · "),
      }));

      evs.sort((a, b) => b.date.localeCompare(a.date));
      if (mounted) { setEvents(evs); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [uid, days]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(e => {
      if (filter !== "all" && e.kind !== filter) return false;
      if (!q) return true;
      const blob = [
        e.title, e.intention, e.outcome, e.notes,
        ...(e.emotions ?? []), ...(e.meta ?? []).map(m => `${m.label} ${m.value}`),
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
  }, [events, filter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    filtered.forEach(e => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    events.forEach(e => { c[e.kind] = (c[e.kind] ?? 0) + 1; });
    return c;
  }, [events]);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Your timeline"
        subtitle="A scrolling memory of how you've been tending to yourself"
        accent="sage"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full bg-muted/50 p-1">
            {[14, 30, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-3 py-1 text-xs transition ${days === d ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {d === 365 ? "1y" : `${d}d`}
              </button>
            ))}
          </div>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emotions, intentions, notes…"
            className="h-9 max-w-xs"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All · ${counts.all ?? 0}`} />
          {(Object.keys(KIND_META) as Event["kind"][]).map(k => (
            <FilterChip
              key={k}
              active={filter === k}
              onClick={() => setFilter(k)}
              label={`${KIND_META[k].label} · ${counts[k] ?? 0}`}
              color={KIND_META[k].color}
            />
          ))}
        </div>
      </SectionCard>

      {loading ? (
        <div className="cozy-card p-10 text-center text-sm text-muted-foreground">Gathering your moments…</div>
      ) : grouped.length === 0 ? (
        <div className="cozy-card flex flex-col items-center gap-3 p-12 text-center">
          <Sparkles className="h-6 w-6 text-secondary-foreground/70" />
          <p className="font-display text-xl">Nothing to look back on yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Once you start logging check-ins, intentions, and rituals, they'll bloom here as a soft chronological story.
          </p>
        </div>
      ) : (
        <div className="cozy-card p-5 sm:p-7">
          <ol className="relative ml-3 space-y-8 border-l border-border/60 pl-6">
            {grouped.map(([date, evs]) => (
              <li key={date} className="relative">
                <span className="absolute -left-[31px] top-1.5 grid h-5 w-5 place-items-center rounded-full bg-card ring-2 ring-border/60">
                  <span className="h-2 w-2 rounded-full bg-secondary-foreground/60" />
                </span>
                <div className="mb-3 flex items-baseline gap-3">
                  <h3 className="font-display text-lg">{prettyDate(date)}</h3>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                    {evs.length} {evs.length === 1 ? "moment" : "moments"}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {evs.map(e => <EventCard key={e.id} ev={e} />)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
        active ? "border-transparent bg-foreground text-background" : "border-border/60 bg-card hover:bg-muted/40"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </button>
  );
}

function EventCard({ ev }: { ev: Event }) {
  const meta = KIND_META[ev.kind];
  const Icon = meta.icon;
  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/70 p-3.5 transition hover:border-border"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">{meta.label}</span>
            <p className="font-medium leading-tight">{ev.title}</p>
          </div>

          {ev.emotions && ev.emotions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ev.emotions.slice(0, 8).map((em, i) => (
                <span key={i} className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px]">{em}</span>
              ))}
            </div>
          )}

          {(ev.intention || ev.outcome) && (
            <div className="mt-2 space-y-1 text-sm">
              {ev.intention && (
                <p><span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Intention · </span>{ev.intention}</p>
              )}
              {ev.outcome && (
                <p><span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Outcome · </span>{ev.outcome}</p>
              )}
            </div>
          )}

          {ev.meta && ev.meta.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {ev.meta.map((m, i) => (
                <span key={i}><span className="opacity-70">{m.label}:</span> <span className="text-foreground/80">{m.value}</span></span>
              ))}
            </div>
          )}

          {ev.notes && (
            <p className="mt-2 text-sm italic text-muted-foreground">"{ev.notes}"</p>
          )}
        </div>
      </div>
    </div>
  );
}