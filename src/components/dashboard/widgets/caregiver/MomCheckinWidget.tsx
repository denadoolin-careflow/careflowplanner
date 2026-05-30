import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadCheckin, saveCheckin, type CaregiverCheckin, todayCheckinISO } from "@/lib/caregiver-checkins";
import { nudgeFor, MOOD_OPTIONS, type CheckinKey } from "@/lib/caregiver-checkin-copy";
import { cn } from "@/lib/utils";

const TRACKERS: { key: CheckinKey; label: string; emoji: string }[] = [
  { key: "water", label: "Water", emoji: "💧" },
  { key: "food", label: "Food", emoji: "🍎" },
  { key: "meds", label: "Meds", emoji: "💊" },
  { key: "outside", label: "Outside", emoji: "🌿" },
  { key: "movement", label: "Move", emoji: "🚶" },
];

export function MomCheckinWidget() {
  const [uid, setUid] = useState<string | null>(null);
  const [ci, setCi] = useState<CaregiverCheckin | null>(null);
  const date = todayCheckinISO();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) setCi(await loadCheckin(id, date));
    });
  }, [date]);

  if (!uid || !ci) return <p className="text-sm text-muted-foreground">Sign in to track your day.</p>;

  async function toggle(key: CheckinKey) {
    const next = { ...ci!, [key]: !ci![key] };
    setCi(next);
    await saveCheckin(uid!, { date, [key]: next[key] } as any);
  }

  async function setEnergy(v: number) {
    setCi({ ...ci!, energy: v });
    await saveCheckin(uid!, { date, energy: v });
  }

  async function setMood(m: string) {
    setCi({ ...ci!, mood: m });
    await saveCheckin(uid!, { date, mood: m });
  }

  const firstMissing = TRACKERS.find((t) => !ci[t.key]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {TRACKERS.map((t) => (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            className={cn(
              "rounded-xl border px-1 py-2 text-center transition-colors",
              ci[t.key]
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-card/60 text-muted-foreground",
            )}
            aria-pressed={ci[t.key]}
          >
            <div className="text-base leading-none">{t.emoji}</div>
            <div className="mt-1 text-[10px]">{t.label}</div>
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Energy {ci.energy ?? "—"}/10</p>
        <input
          type="range" min={1} max={10}
          value={ci.energy ?? 5}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMood(m.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
              ci.mood === m.value
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card/60 text-muted-foreground",
            )}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {firstMissing && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs italic text-foreground/70">
          💜 {nudgeFor(firstMissing.key)}
        </p>
      )}
    </div>
  );
}