import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  getMoonPhase,
  MOON_INFO,
  type MoonPhase,
} from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { MoonCalendar } from "./MoonCalendar";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { LunarPhaseWidget } from "@/components/lunar/LunarPhaseWidget";
import { PhasePlanningCard } from "@/components/lunar/PhasePlanningCard";

const RITUALS: Record<
  MoonPhase,
  { ritual: string; prompts: string[]; pacing: string }
> = {
  new: {
    ritual:
      "Light a single candle. Write one quiet wish. Tuck it somewhere unseen.",
    prompts: [
      "What seed wants to be planted this cycle?",
      "What am I being invited to begin, softly?",
      "What does 'enough' look like this month?",
    ],
    pacing: "Slow start. Honor the dark before the doing.",
  },
  "waxing-crescent": {
    ritual: "Name one small step. Take it before the day ends.",
    prompts: [
      "What's stirring just under the surface?",
      "Where do I feel a quiet 'yes'?",
    ],
    pacing: "Gentle momentum. Tiny actions count.",
  },
  "first-quarter": {
    ritual:
      "Notice the friction. Choose which one to walk through, which to release.",
    prompts: [
      "What's asking for my commitment?",
      "Where am I being asked to stay, even when it's hard?",
    ],
    pacing: "Make decisions. Move through resistance with care.",
  },
  "waxing-gibbous": {
    ritual: "Tend, don't begin. Water what's already growing.",
    prompts: [
      "What needs my attention to ripen?",
      "What am I tempted to abandon too early?",
    ],
    pacing: "Focused tending. Resist starting new.",
  },
  full: {
    ritual:
      "Stand in the moonlight if you can. Speak aloud what is true right now.",
    prompts: [
      "What is being revealed to me?",
      "What am I ready to celebrate, even unfinished?",
      "What is full, even tired?",
    ],
    pacing: "Peak energy. Feel without fixing.",
  },
  "waning-gibbous": {
    ritual: "Share something — a meal, a thank-you, a story.",
    prompts: [
      "Who am I grateful for this cycle?",
      "What wisdom do I want to pass on?",
    ],
    pacing: "Give back. Integrate what you've learned.",
  },
  "last-quarter": {
    ritual:
      "Write what you're ready to release. Burn, bury, or delete it gently.",
    prompts: [
      "What no longer fits?",
      "What am I willing to outgrow?",
    ],
    pacing: "Edit. Decline. Make space.",
  },
  "waning-crescent": {
    ritual: "Soft music, soft light, soft food. Rest is the offering.",
    prompts: [
      "What is asking to be laid down?",
      "How can I prepare a quiet nest for the next new moon?",
    ],
    pacing: "Restore. Prepare for renewal.",
  },
};

interface MoonEntry {
  id: string;
  date: string;
  moon_phase: string;
  title: string | null;
  body: string;
  mood: string | null;
  energy: string | null;
  intentions: string[];
  releases: string[];
  gratitude: string[];
  cycle_phase: string | null;
}

export default function LunarLivingPage() {
  const { settings, periods } = useCycle();
  const [uid, setUid] = useState<string | null>(null);
  const [selected, setSelected] = useState<Date>(new Date());
  const [entries, setEntries] = useState<MoonEntry[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    intentions: [""],
    releases: [""],
    gratitude: [""],
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const reload = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase
      .from("moon_journal_entries")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(60);
    setEntries(
      ((data ?? []) as any[]).map((r) => ({
        ...r,
        intentions: r.intentions ?? [],
        releases: r.releases ?? [],
        gratitude: r.gratitude ?? [],
      })),
    );
  }, [uid]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectedIso = format(selected, "yyyy-MM-dd");
  const selectedPhase = getMoonPhase(selected);
  const moon = MOON_INFO[selectedPhase];
  const ritual = RITUALS[selectedPhase];

  const todayInfo = useMemo(
    () =>
      settings.enabled ? getPhaseInfo(selected, periods, settings) : null,
    [selected, periods, settings],
  );

  // Load existing entry for selected date
  useEffect(() => {
    const existing = entries.find((e) => e.date === selectedIso);
    if (existing) {
      setEditingId(existing.id);
      setDraft({
        title: existing.title ?? "",
        body: existing.body,
        intentions: existing.intentions.length ? existing.intentions : [""],
        releases: existing.releases.length ? existing.releases : [""],
        gratitude: existing.gratitude.length ? existing.gratitude : [""],
      });
    } else {
      setEditingId(null);
      setDraft({ title: "", body: "", intentions: [""], releases: [""], gratitude: [""] });
    }
  }, [selectedIso, entries]);

  const markedDates = useMemo(
    () => new Set(entries.map((e) => e.date)),
    [entries],
  );

  async function save() {
    if (!uid) return;
    setSaving(true);
    const payload = {
      user_id: uid,
      date: selectedIso,
      moon_phase: selectedPhase,
      title: draft.title || null,
      body: draft.body,
      intentions: draft.intentions.filter(Boolean),
      releases: draft.releases.filter(Boolean),
      gratitude: draft.gratitude.filter(Boolean),
      cycle_phase: todayInfo?.phase ?? null,
    };
    const q = editingId
      ? supabase.from("moon_journal_entries").update(payload).eq("id", editingId)
      : supabase.from("moon_journal_entries").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Entry saved");
      reload();
    }
  }

  async function remove() {
    if (!editingId) return;
    await supabase.from("moon_journal_entries").delete().eq("id", editingId);
    toast.success("Removed");
    reload();
  }

  return (
    <div className="space-y-6">
      <LunarPhaseWidget date={selected} />
      <PhasePlanningCard date={selected} />

      {/* CALENDAR + JOURNAL */}
      <div className="grid gap-5 lg:grid-cols-[1fr,1.2fr]">
        <SectionCard title="Moon calendar" accent="calm">
          <MoonCalendar
            selected={selected}
            onSelect={setSelected}
            markedDates={markedDates}
          />
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> dot = journal entry
          </p>
        </SectionCard>

        <SectionCard
          title={`${moon.label} · ${format(selected, "EEE MMM d")}`}
          subtitle={ritual.pacing}
          accent="sage"
        >
          {/* Ritual */}
          <div className="rounded-xl border border-border/60 bg-card/60 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ritual
            </p>
            <p className="mt-1 text-sm italic text-foreground/85">"{ritual.ritual}"</p>
          </div>

          {/* Prompts */}
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Reflective prompts
            </p>
            <ul className="mt-1.5 space-y-1">
              {ritual.prompts.map((p) => (
                <li
                  key={p}
                  className="rounded-lg bg-secondary-soft/40 px-3 py-2 text-xs italic text-foreground/80"
                >
                  "{p}"
                </li>
              ))}
            </ul>
          </div>

          {/* Journal form */}
          <div className="mt-4 space-y-2">
            <Input
              placeholder="Title (optional)"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <Textarea
              placeholder="Write freely…"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={5}
            />

            <ListField
              label="Intentions"
              values={draft.intentions}
              onChange={(v) => setDraft({ ...draft, intentions: v })}
              placeholder="What I'm planting…"
            />
            <ListField
              label="Releasing"
              values={draft.releases}
              onChange={(v) => setDraft({ ...draft, releases: v })}
              placeholder="What I'm letting go…"
            />
            <ListField
              label="Gratitude"
              values={draft.gratitude}
              onChange={(v) => setDraft({ ...draft, gratitude: v })}
              placeholder="What I'm grateful for…"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Button onClick={save} disabled={saving} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {editingId ? "Update entry" : "Save entry"}
                </Button>
                {editingId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={remove}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {todayInfo && (
                <p className="text-[10px] text-muted-foreground">
                  Cycle phase: {todayInfo.label.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* RECENT ENTRIES */}
      {entries.length > 0 && (
        <SectionCard title="Recent reflections" accent="warm">
          <ul className="space-y-2">
            {entries.slice(0, 6).map((e) => (
              <li
                key={e.id}
                className="cursor-pointer rounded-xl border border-border/50 bg-card/60 p-3 transition hover:border-primary/40"
                onClick={() => setSelected(parseISO(e.date))}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MoonGlyph date={parseISO(e.date)} size={18} />
                  <span>{format(parseISO(e.date), "MMM d, yyyy")}</span>
                  <span>· {MOON_INFO[e.moon_phase as MoonPhase]?.label}</span>
                </div>
                {e.title && (
                  <p className="mt-1 font-display text-base">{e.title}</p>
                )}
                {e.body && (
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/75">
                    {e.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

function ListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <Input
            key={i}
            value={v}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              // auto-grow: add empty line when last filled
              if (i === next.length - 1 && e.target.value && next.length < 5) {
                next.push("");
              }
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}