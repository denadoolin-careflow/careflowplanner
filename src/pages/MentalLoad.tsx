import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Leaf } from "lucide-react";
import { BrainDumpInbox } from "@/components/mental-load/BrainDumpInbox";
import { OverwhelmCheckin } from "@/components/mental-load/OverwhelmCheckin";
import { PriorityAssistant } from "@/components/mental-load/PriorityAssistant";
import { DecisionSupport } from "@/components/mental-load/DecisionSupport";
import { MinimumViableDay } from "@/components/mental-load/MinimumViableDay";
import { GentleRhythm } from "@/components/mental-load/GentleRhythm";
import { loadTodayCheckin, MentalLoadCheckin, loadWord } from "@/lib/mental-load";

export default function MentalLoad() {
  const [uid, setUid] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<MentalLoadCheckin | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUid(id);
      if (id) loadTodayCheckin(id).then(setCheckin);
    });
  }, []);

  if (!uid) return null;

  const headline = !checkin
    ? "Today, gently. Start with a soft check-in whenever you're ready."
    : checkin.minimum_mode
      ? "Gentle mode is on. Everything else can wait."
      : `You're carrying a ${loadWord(Math.round(((6 - checkin.energy) + checkin.emotional + checkin.caregiving) / 3))} load today — here's a softer plan.`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <header className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-6">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Leaf className="h-3.5 w-3.5" /> Mental load
        </div>
        <h1 className="font-display text-2xl leading-tight sm:text-3xl">A calm second brain.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{headline}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <BrainDumpInbox uid={uid} />
        <OverwhelmCheckin uid={uid} onSaved={setCheckin} />
        <PriorityAssistant uid={uid} />
        <DecisionSupport uid={uid} />
      </div>

      <MinimumViableDay uid={uid} />
      <GentleRhythm uid={uid} />
    </div>
  );
}