import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Sparkles, Sun, Moon, Cloud, RefreshCw, Wind, Anchor, Music, Leaf,
  NotebookPen, Heart, ChevronRight, Loader2, Check, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { personalGreeting, timeOfDayGreeting } from "@/lib/greeting";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { isoToday, type CheckInAiPayload } from "@/lib/daily-checkin-store";
import { getMoonData } from "@/lib/moon-providers";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { setIntention } from "@/lib/daily-intention";
import { toast } from "sonner";

const MOODS: { key: string; emoji: string; label: string }[] = [
  { key: "great", emoji: "😊", label: "Great" },
  { key: "good", emoji: "🙂", label: "Good" },
  { key: "okay", emoji: "😐", label: "Okay" },
  { key: "low", emoji: "😔", label: "Low" },
  { key: "overwhelmed", emoji: "😣", label: "Overwhelmed" },
];

const MOOD_RESPONSES: Record<string, string> = {
  great: "Beautiful. Ride this steady energy and share a little of it with someone.",
  good: "A soft, sturdy start. Move gently through your rhythm.",
  okay: "Neutral is a fine place to begin. One kind choice at a time.",
  low: "Thank you for telling me. Lighten the day where you can and be tender with yourself.",
  overwhelmed: "Let's soften today. Choose one thing that matters and let the rest wait.",
};

function greetingEmoji(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "☀️";
  if (h < 17) return "🌿";
  return "🌙";
}

export default function DailyCheckIn() {
  const nav = useNavigate();
  const iso = isoToday();
  const now = new Date();
  const { state } = useStore();
  const { record, loading, generating, error, generate, update, complete } = useDailyCheckIn(iso);
  const [captureText, setCaptureText] = useState("");
  const [gratitude, setGratitude] = useState<string[]>(["", "", ""]);
  const [intention, setLocalIntention] = useState("");
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const moon = useMemo(() => getMoonData(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const payload = record?.ai_payload as CheckInAiPayload | null;

  useEffect(() => {
    if (!loading && !payload && !generating && !error) generate();
  }, [loading, payload, generating, error, generate]);

  useEffect(() => {
    if (record?.capture_text) setCaptureText(record.capture_text);
    if (record?.gratitude?.length) setGratitude([
      record.gratitude[0] ?? "",
      record.gratitude[1] ?? "",
      record.gratitude[2] ?? "",
    ]);
    if (record?.chosen_intention) setLocalIntention(record.chosen_intention);
  }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  const meterTone = payload?.energy.meter === "calm" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : payload?.energy.meter === "active" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

  async function handleComplete() {
    await update({
      capture_text: captureText.trim() || null,
      gratitude: gratitude.filter(Boolean),
      chosen_intention: intention.trim() || payload?.method.anchor.intention || null,
    });
    if (intention.trim()) setIntention(iso, intention.trim());
    else if (payload?.method.anchor.intention) setIntention(iso, payload.method.anchor.intention);
    await complete();
    toast.success("Check-in saved. Have a beautiful day. 🌿");
    nav("/today");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        {/* Back */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/today"><ArrowLeft className="mr-1 h-4 w-4" /> Today</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => generate(true)} disabled={generating}>
            <RefreshCw className={cn("mr-1 h-4 w-4", generating && "animate-spin")} />
            Regenerate
          </Button>
        </div>

        {/* Hero */}
        <Card className="reset-glass overflow-hidden border-secondary/40 p-6 sm:p-8">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Morning check-in
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
            {timeOfDayGreeting(now)}
            {state.settings?.name ? `, ${state.settings.name}` : ""} {greetingEmoji(now)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(now, "EEEE, MMMM d")} · {format(now, "h:mm a")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {tempStr && (
              <Badge variant="secondary" className="gap-1 font-normal">
                <Cloud className="h-3 w-3" /> {tempStr} {snap?.conditionLabel}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 font-normal">
              <Moon className="h-3 w-3" /> {moon.label}
              {moon.sign ? <span className="opacity-70">· {moon.sign}</span> : null}
            </Badge>
            {payload && (
              <Badge className={cn("gap-1 font-normal border-0", meterTone)}>
                <Sun className="h-3 w-3" /> {payload.energy.meter}
              </Badge>
            )}
          </div>
        </Card>

        {loading || (generating && !payload) ? (
          <Card className="reset-glass mt-4 flex items-center gap-3 p-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Tuning in to your day…
          </Card>
        ) : error && !payload ? (
          <Card className="reset-glass mt-4 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" className="mt-3" onClick={() => generate(true)}>Try again</Button>
          </Card>
        ) : payload ? (
          <>
            {/* Energy */}
            <Section icon={<Sun className="h-4 w-4" />} title="Daily energy" className="mt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Overall" value={payload.energy.overall} />
                <Field label="Mood theme" value={payload.energy.moodTheme} />
                <Field label="Focus theme" value={payload.energy.focusTheme} />
                <Field label="Watch for" value={payload.energy.challenge} />
                <Field label="Hidden opportunity" value={payload.energy.opportunity} className="sm:col-span-2" />
              </div>
            </Section>

            {/* Moon guidance */}
            <Section icon={<Moon className="h-4 w-4" />} title="Personal moon guidance" className="mt-4">
              <p className="text-sm leading-relaxed text-foreground/85">{payload.moonGuidance.summary}</p>
              <p className="mt-2 text-[13px] italic text-muted-foreground">{payload.moonGuidance.houseMeaning}</p>
              <Collapsible className="mt-3">
                <CollapsibleTrigger className="text-xs font-medium text-primary hover:underline">
                  Learn more →
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(payload.moonGuidance.lifeAreas).map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border/40 bg-card/60 p-2.5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
                      <p className="mt-0.5 text-[13px]">{v}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </Section>

            {/* CareFlow Method 2x2 */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Section icon={<NotebookPen className="h-4 w-4" />} title="Capture">
                <p className="text-sm italic text-foreground/85">"{payload.method.capture.question}"</p>
                <Textarea
                  value={captureText}
                  onChange={(e) => setCaptureText(e.target.value)}
                  placeholder="Write what's on your mind…"
                  className="mt-2 min-h-[90px]"
                />
                {payload.method.capture.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {payload.method.capture.tags.map((t) => (
                      <Badge key={t} variant="outline" className="font-normal">#{t}</Badge>
                    ))}
                  </div>
                )}
              </Section>

              <Section icon={<Anchor className="h-4 w-4" />} title="Anchor">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Suggested intention</p>
                <p className="mt-0.5 font-display text-lg">{payload.method.anchor.intention}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{payload.method.anchor.why}</p>
                <Input
                  value={intention}
                  onChange={(e) => setLocalIntention(e.target.value)}
                  placeholder="Edit or accept"
                  className="mt-3"
                />
              </Section>

              <Section icon={<Music className="h-4 w-4" />} title="Rhythm">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top 3 priorities</p>
                <ol className="mt-1 space-y-1 text-sm">
                  {payload.method.rhythm.priorities.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex gap-2"><span className="text-primary">{i + 1}.</span>{p}</li>
                  ))}
                </ol>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Suggested rhythm</p>
                <ul className="mt-1 space-y-1 text-[13px]">
                  {payload.method.rhythm.blocks.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-14 shrink-0 tabular-nums text-muted-foreground">{b.time}</span>
                      <span className="flex-1">{b.label}</span>
                      <Badge variant="outline" className="ml-auto font-normal text-[10px] opacity-70">{b.kind}</Badge>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={<Leaf className="h-4 w-4" />} title="Exhale">
                <ExhaleRow label="Release" value={payload.method.exhale.release} />
                <ExhaleRow label="Boundary" value={payload.method.exhale.boundary} />
                <ExhaleRow label="Self-care" value={payload.method.exhale.selfCare} />
                <ExhaleRow label="Breathing" value={payload.method.exhale.breathing} />
              </Section>
            </div>

            {/* Insight */}
            <Section icon={<Sparkles className="h-4 w-4" />} title="Today's insight" className="mt-4">
              <p className="text-sm leading-relaxed text-foreground/85">{payload.insight}</p>
            </Section>

            {/* Mantra */}
            <Section icon={<Heart className="h-4 w-4" />} title="Today's mantra" className="mt-4">
              <blockquote className="font-display text-xl italic leading-snug text-foreground/90">
                "{payload.mantra}"
              </blockquote>
              <Button
                variant="ghost" size="sm" className="mt-2"
                onClick={() => { void update({ saved_mantra: payload.mantra }); toast.success("Saved to favorites"); }}
              >
                <Heart className="mr-1 h-3.5 w-3.5" /> Save to favorites
              </Button>
            </Section>

            {/* Mood */}
            <Section icon={<Wind className="h-4 w-4" />} title="Mood check-in" className="mt-4">
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => update({ mood: m.key })}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      record?.mood === m.key
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 hover:bg-secondary/40",
                    )}
                  >
                    <span className="mr-1">{m.emoji}</span>{m.label}
                  </button>
                ))}
              </div>
              {record?.mood && (
                <p className="mt-3 text-[13px] italic text-muted-foreground">
                  {MOOD_RESPONSES[record.mood]}
                </p>
              )}
            </Section>

            {/* Gratitude */}
            <Section icon={<Heart className="h-4 w-4" />} title="Gratitude" className="mt-4">
              <p className="text-[11px] text-muted-foreground">Three things you're grateful for</p>
              <div className="mt-2 space-y-2">
                {gratitude.map((g, i) => (
                  <Input
                    key={i}
                    value={g}
                    onChange={(e) => {
                      const next = [...gratitude];
                      next[i] = e.target.value;
                      setGratitude(next);
                    }}
                    placeholder={`I'm grateful for…`}
                  />
                ))}
              </div>
            </Section>

            {/* Recommendations */}
            <Section icon={<Sparkles className="h-4 w-4" />} title="Carey's recommendations" className="mt-4">
              <ul className="space-y-1.5 text-sm">
                {payload.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* Complete */}
            <div className="sticky bottom-4 mt-6 flex justify-end">
              <Button size="lg" className="rounded-full shadow-lg" onClick={handleComplete}>
                <Check className="mr-1.5 h-4 w-4" /> Complete check-in
              </Button>
            </div>

            <p className="mt-6 text-center text-xs italic text-muted-foreground">
              Tonight you'll be invited to reflect on how today unfolded.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  icon, title, children, className,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("reset-glass border-secondary/40 p-5", className)}>
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-md border border-border/40 bg-card/60 p-2.5", className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[13px]">{value}</p>
    </div>
  );
}

function ExhaleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="text-[13px]">{value}</p>
    </div>
  );
}