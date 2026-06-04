import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { parseISO, format } from "date-fns";
import { ChevronLeft, BookHeart, Bell, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/cards/PageHeader";
import { decodeEventId } from "@/lib/cosmic/event-id";
import { eventsOnDay } from "@/lib/cosmic/events";
import {
  PHASE_TITLES, PHASE_GUIDANCE, PHASE_PROMPT,
  PLANET_THEMES, SIGN_THEMES,
  RETROGRADE_GUIDANCE, VOC_GUIDANCE, ECLIPSE_GUIDANCE,
  lifeAreasFor,
} from "@/lib/cosmic/copy";
import { supabase } from "@/integrations/supabase/client";
import { saveCosmicEvent, logCosmicJournal } from "@/lib/cosmic/hooks";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export default function CosmicFlowEventDetail() {
  const { id = "" } = useParams();
  const ref = useMemo(() => decodeEventId(decodeURIComponent(id)), [id]);
  const navigate = useNavigate();
  const { addTask } = useStore();
  const [saving, setSaving] = useState(false);

  if (!ref) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-muted-foreground">That cosmic event reference looks malformed.</p>
        <Button asChild variant="link"><Link to="/cosmic-flow">Back to Cosmic Flow</Link></Button>
      </div>
    );
  }

  const date = parseISO(ref.date);
  const event = eventsOnDay(date).find(e => e.id === decodeURIComponent(id)) ?? null;
  const title = event?.title ?? buildFallbackTitle(ref);
  const glyph = event?.glyph ?? "✨";

  const { meaning, theme, planning, prompt } = describe(ref);
  const areas = lifeAreasFor(ref.planet, ref.sign);

  const onSaveJournal = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Sign in first.");
      const { data, error } = await (supabase as any)
        .from("journal_entries")
        .insert({
          user_id: u.user.id,
          title: `${glyph} ${title}`,
          body: `${prompt}\n\n`,
          mood: null,
        })
        .select("id")
        .single();
      if (error) throw error;
      await logCosmicJournal({
        journal_entry_id: (data as any).id,
        event_id: decodeURIComponent(id),
        event_kind: ref.kind,
        planet: ref.planet,
        sign: ref.sign,
        phase: ref.phase,
        event_date: ref.date,
      });
      toast.success("Saved to journal");
      navigate("/journal");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onAddReminder = async () => {
    try {
      await saveCosmicEvent({
        event_id: decodeURIComponent(id),
        event_kind: ref.kind,
        event_date: ref.date,
        reminder_at: date.toISOString(),
        payload: { title, glyph, prompt },
      });
      toast.success("Reminder saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save reminder");
    }
  };

  const onCreateTask = async () => {
    try {
      await addTask({
        title: `${glyph} ${title}`,
        notes: `${meaning}\n\n${planning}`,
        dueDate: ref.date,
        area: "Today" as any,
      } as any);
      toast.success("Task created");
      navigate(`/today?date=${ref.date}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create task");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:p-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><span aria-hidden>{glyph}</span> {title}</span>}
        subtitle={format(date, "EEEE, MMMM d, yyyy")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/cosmic-flow/timeline" className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" />Timeline</Link>
          </Button>
        }
      />

      <section className="cozy-card space-y-3 p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Meaning</p>
          <p className="mt-1 text-[14.5px] leading-relaxed">{meaning}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Emotional theme</p>
          <p className="mt-1 text-[14px] text-muted-foreground">{theme}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Planning guidance</p>
          <p className="mt-1 text-[14px]">{planning}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Journal prompt</p>
          <p className="mt-1 italic text-[14px]">"{prompt}"</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Related life areas</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {areas.map(a => <Badge key={a} variant="secondary" className="font-normal">{a}</Badge>)}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSaveJournal} disabled={saving} className="gap-1.5">
          <BookHeart className="h-4 w-4" />Save to journal
        </Button>
        <Button onClick={onAddReminder} variant="outline" className="gap-1.5">
          <Bell className="h-4 w-4" />Add reminder
        </Button>
        <Button onClick={onCreateTask} variant="outline" className="gap-1.5">
          <ListChecks className="h-4 w-4" />Create a task
        </Button>
      </div>
    </div>
  );
}

function buildFallbackTitle(ref: ReturnType<typeof decodeEventId>): string {
  if (!ref) return "Cosmic event";
  if (ref.kind === "phase" && ref.phase) return PHASE_TITLES[ref.phase as keyof typeof PHASE_TITLES] ?? "Moon phase";
  if (ref.kind === "ingress" && ref.planet && ref.sign) return `${ref.planet} enters ${ref.sign}`;
  if (ref.kind === "retrograde" && ref.planet) return `${ref.planet} retrograde`;
  if (ref.kind === "direct" && ref.planet) return `${ref.planet} stations direct`;
  if (ref.kind === "voc") return "Void-of-course moon";
  if (ref.kind === "eclipse") return ref.phase === "full" ? "Lunar Eclipse" : "Solar Eclipse";
  return "Cosmic event";
}

function describe(ref: NonNullable<ReturnType<typeof decodeEventId>>) {
  if (ref.kind === "phase" && ref.phase) {
    const p = ref.phase as keyof typeof PHASE_GUIDANCE;
    return {
      meaning: PHASE_TITLES[p] ?? "A moon phase to honor.",
      theme: "Cycles and rhythms.",
      planning: PHASE_GUIDANCE[p],
      prompt: PHASE_PROMPT[p],
    };
  }
  if (ref.kind === "ingress" && ref.planet && ref.sign) {
    return {
      meaning: `${ref.planet} steps into ${ref.sign}, shifting the day's flavor toward ${SIGN_THEMES[ref.sign as keyof typeof SIGN_THEMES] ?? "new ground"}.`,
      theme: PLANET_THEMES[ref.planet as keyof typeof PLANET_THEMES] ?? "An energy shift.",
      planning: `Let your plans for the next few weeks lean into ${SIGN_THEMES[ref.sign as keyof typeof SIGN_THEMES]}.`,
      prompt: `Where in my life is ${ref.planet} energy asking to move differently?`,
    };
  }
  if (ref.kind === "retrograde" && ref.planet) {
    return {
      meaning: `${ref.planet} turns inward — a review season begins.`,
      theme: PLANET_THEMES[ref.planet as keyof typeof PLANET_THEMES] ?? "Reflection.",
      planning: RETROGRADE_GUIDANCE[ref.planet] ?? "Slow down. Revisit before launching.",
      prompt: `What is ${ref.planet} asking me to revise rather than restart?`,
    };
  }
  if (ref.kind === "direct" && ref.planet) {
    return {
      meaning: `${ref.planet} resumes forward motion. The review season closes.`,
      theme: PLANET_THEMES[ref.planet as keyof typeof PLANET_THEMES] ?? "Forward motion.",
      planning: `Translate what you learned during the retrograde into one small next step.`,
      prompt: `What did the past few weeks teach me about ${ref.planet} energy in my life?`,
    };
  }
  if (ref.kind === "voc") {
    return {
      meaning: "The moon makes no major aspects before changing sign — a brief, dreamy in-between.",
      theme: "Drift, not launch.",
      planning: VOC_GUIDANCE,
      prompt: "What can I let be unfinished today?",
    };
  }
  if (ref.kind === "eclipse") {
    return {
      meaning: ref.phase === "full" ? "A lunar eclipse — a felt culmination." : "A solar eclipse — a felt beginning.",
      theme: "Amplified moon.",
      planning: ECLIPSE_GUIDANCE,
      prompt: "What is this moment trying to bring to the surface?",
    };
  }
  return {
    meaning: "A gentle cosmic note for today.",
    theme: "Ordinary magic.",
    planning: "Move at the pace of kindness.",
    prompt: "What feels alive in me right now?",
  };
}