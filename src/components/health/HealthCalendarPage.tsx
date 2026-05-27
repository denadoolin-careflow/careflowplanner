import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Heart, Activity, Brain, Moon, Droplets, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

type DayBundle = {
  checkin?: any;
  movement: any[];
  mental?: any;
  sleep?: any;
  rituals: any[];
};

const KIND_META = {
  checkin: { label: "Check-in", icon: Heart, color: "hsl(340 50% 60%)" },
  movement: { label: "Movement", icon: Activity, color: "hsl(145 45% 50%)" },
  mental: { label: "Mental", icon: Brain, color: "hsl(265 40% 60%)" },
  sleep: { label: "Sleep", icon: Moon, color: "hsl(230 45% 60%)" },
  ritual: { label: "Ritual", icon: Sparkles, color: "hsl(195 50% 55%)" },
} as const;

function monthGrid(year: number, monthIdx: number) {
  const first = new Date(year, monthIdx, 1);
  const startDow = first.getDay(); // 0 sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function HealthCalendarPage({ uid }: { uid: string }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));
  const [data, setData] = useState<Record<string, DayBundle>>({});

  const monthStart = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const monthEnd = ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));

  useEffect(() => {
    async function load() {
      const [ch, mv, mh, sl, wr] = await Promise.all([
        supabase.from("health_checkins").select("*").eq("user_id", uid).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("movement_logs").select("*").eq("user_id", uid).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("mental_health_logs").select("*").eq("user_id", uid).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("sleep_logs").select("*").eq("user_id", uid).gte("date", monthStart).lte("date", monthEnd),
        supabase.from("wellness_rituals").select("*").eq("user_id", uid).gte("date", monthStart).lte("date", monthEnd),
      ]);
      const out: Record<string, DayBundle> = {};
      const ensure = (d: string) => (out[d] ??= { movement: [], rituals: [] });
      ch.data?.forEach((r: any) => { ensure(r.date).checkin = r; });
      mv.data?.forEach((r: any) => { ensure(r.date).movement.push(r); });
      mh.data?.forEach((r: any) => { ensure(r.date).mental = r; });
      sl.data?.forEach((r: any) => { ensure(r.date).sleep = r; });
      wr.data?.forEach((r: any) => { ensure(r.date).rituals.push(r); });
      setData(out);
    }
    load();
  }, [uid, monthStart, monthEnd]);

  const cells = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayIso = ymd(today);
  const sel = data[selected];

  function dotsFor(bundle?: DayBundle) {
    if (!bundle) return [];
    const dots: { key: keyof typeof KIND_META; color: string }[] = [];
    if (bundle.checkin) dots.push({ key: "checkin", color: KIND_META.checkin.color });
    if (bundle.movement.length) dots.push({ key: "movement", color: KIND_META.movement.color });
    if (bundle.mental) dots.push({ key: "mental", color: KIND_META.mental.color });
    if (bundle.sleep) dots.push({ key: "sleep", color: KIND_META.sleep.color });
    if (bundle.rituals.length) dots.push({ key: "ritual", color: KIND_META.ritual.color });
    return dots;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      {/* Calendar */}
      <div className="cozy-card overflow-hidden" style={{ background: "linear-gradient(160deg, hsl(145 32% 95%) 0%, hsl(40 45% 96%) 100%)" }}>
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Health Calendar</p>
            <h2 className="font-display text-2xl">{monthLabel}</h2>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(ymd(t)); }}>
              <span className="text-xs">Today</span>
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border/30 px-3 py-3">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="bg-transparent py-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="bg-transparent" />;
            const iso = ymd(d);
            const bundle = data[iso];
            const dots = dotsFor(bundle);
            const isToday = iso === todayIso;
            const isSelected = iso === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={`aspect-square rounded-lg p-1.5 text-left transition-all ${
                  isSelected ? "bg-card shadow-soft ring-2 ring-primary" : isToday ? "bg-card/80" : "bg-card/40 hover:bg-card/70"
                }`}
              >
                <div className={`text-xs ${isToday ? "font-bold text-primary" : ""}`}>{d.getDate()}</div>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dots.map((dot, j) => (
                    <span key={j} className="h-1.5 w-1.5 rounded-full" style={{ background: dot.color }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 border-t border-border/40 px-5 py-3">
          {Object.entries(KIND_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Day detail */}
      <div className="cozy-card p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Selected day</p>
        <h3 className="font-display text-2xl">
          {new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h3>

        {!sel ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing logged for this day yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Visit the Check-in, Movement, or Mental Health tabs to add an entry.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sel.checkin && (
              <DetailCard kind="checkin">
                <p className="text-sm">
                  Mood <b className="capitalize">{sel.checkin.mood ?? "–"}</b> · Stress <b className="capitalize">{sel.checkin.stress ?? "–"}</b>
                </p>
                <p className="text-xs text-muted-foreground">
                  Sleep {sel.checkin.sleep_hours ?? "–"}h · Water {sel.checkin.water_cups ?? "–"} cups
                  {sel.checkin.mindfulness_minutes ? ` · Mindful ${sel.checkin.mindfulness_minutes}m` : ""}
                  {sel.checkin.meds_taken ? " · Meds ✓" : ""}
                </p>
                {sel.checkin.notes && <p className="mt-1 text-xs italic text-muted-foreground">"{sel.checkin.notes}"</p>}
              </DetailCard>
            )}

            {sel.movement.length > 0 && (
              <DetailCard kind="movement">
                <ul className="space-y-1 text-sm">
                  {sel.movement.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-2">
                      <span>{m.activity}</span>
                      <span className="text-xs text-muted-foreground">{m.minutes}m · {m.intensity}</span>
                    </li>
                  ))}
                </ul>
              </DetailCard>
            )}

            {sel.mental && (
              <DetailCard kind="mental">
                <p className="text-sm">
                  Mood {sel.mental.mood_score ?? "–"}/5 · Anx {sel.mental.anxiety ?? "–"}/5 · Focus {sel.mental.focus ?? "–"}/5
                </p>
                {sel.mental.emotions?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sel.mental.emotions.map((e: string) => (
                      <span key={e} className="rounded-full bg-card/70 px-2 py-0.5 text-[10px] capitalize">{e}</span>
                    ))}
                  </div>
                )}
                {sel.mental.gratitude && <p className="mt-1 text-xs italic text-muted-foreground">✨ {sel.mental.gratitude}</p>}
                {sel.mental.support_needed && <p className="mt-1 text-xs text-muted-foreground">💚 {sel.mental.support_needed}</p>}
              </DetailCard>
            )}

            {sel.sleep && (
              <DetailCard kind="sleep">
                <p className="text-sm">
                  {sel.sleep.bedtime ?? "–"} → {sel.sleep.wake_time ?? "–"} · {sel.sleep.hours_slept ?? "–"}h · Quality {sel.sleep.quality ?? "–"}/5
                </p>
                {sel.sleep.dreams && <p className="mt-1 text-xs italic text-muted-foreground">💭 {sel.sleep.dreams}</p>}
              </DetailCard>
            )}

            {sel.rituals.length > 0 && (
              <DetailCard kind="ritual">
                <div className="flex flex-wrap gap-1.5">
                  {sel.rituals.map(r => (
                    <span key={r.id} className="rounded-full bg-card/70 px-2 py-0.5 text-[11px] capitalize">
                      {r.ritual_type.replace(/_/g, " ")}
                      {r.duration_minutes ? ` ${r.duration_minutes}m` : ""}
                      {r.amount ? ` ×${r.amount}` : ""}
                    </span>
                  ))}
                </div>
              </DetailCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ kind, children }: { kind: keyof typeof KIND_META; children: React.ReactNode }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${meta.color}20`, color: meta.color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{meta.label}</p>
      </div>
      {children}
    </div>
  );
}