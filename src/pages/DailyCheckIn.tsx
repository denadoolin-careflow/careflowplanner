import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Sparkles, Sun, Moon, Cloud, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { timeOfDayGreeting, resolveDisplayName } from "@/lib/greeting";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { isoToday, type CheckInAiPayload } from "@/lib/daily-checkin-store";
import { getMoonData } from "@/lib/moon-providers";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { setIntention } from "@/lib/daily-intention";
import { toast } from "sonner";
import { CheckInProgress } from "@/components/checkin/CheckInProgress";
import { StepArrive } from "@/components/checkin/StepArrive";
import { StepNoticed } from "@/components/checkin/StepNoticed";
import { StepBuild } from "@/components/checkin/StepBuild";
import { StepClose } from "@/components/checkin/StepClose";

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
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [gratitude, setGratitude] = useState<string[]>([""]);
  const [intention, setLocalIntention] = useState("");
  const [completing, setCompleting] = useState(false);
  const hydrated = useRef(false);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const moon = useMemo(() => getMoonData(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const payload = record?.ai_payload as CheckInAiPayload | null;

  // Hydrate local drafts once the stored record lands, and resume where the user
  // left off — an existing payload means the AI call already happened today.
  useEffect(() => {
    if (loading || hydrated.current) return;
    hydrated.current = true;
    if (record?.capture_text) setCaptureText(record.capture_text);
    if (record?.mood) setMood(record.mood);
    if (record?.gratitude?.length) setGratitude(record.gratitude);
    if (record?.chosen_intention) setLocalIntention(record.chosen_intention);
    if (record?.ai_payload) { setStep(1); setMaxReached(3); }
  }, [loading, record]);

  const goTo = (next: number) => {
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const regenerate = () =>
    generate({ force: true, mood, captureText: captureText.trim() || null });

  async function handleArriveContinue() {
    goTo(1);
    await regenerate();
  }

  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  const meterTone = payload?.energy.meter === "calm" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : payload?.energy.meter === "active" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
    : "bg-rose-500/15 text-rose-700 dark:text-rose-300";

  async function handleComplete() {
    setCompleting(true);
    try {
      const finalIntention = intention.trim() || payload?.method.anchor.intention || null;
      await update({
        mood,
        capture_text: captureText.trim() || null,
        gratitude: gratitude.map((g) => g.trim()).filter(Boolean),
        chosen_intention: finalIntention,
      });
      if (finalIntention) setIntention(iso, finalIntention);
      await complete();
      toast.success("Check-in saved. Have a beautiful day. 🌿");
      nav("/today");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/today"><ArrowLeft className="mr-1 h-4 w-4" /> Today</Link>
          </Button>
        </div>

        {/* Hero */}
        <Card className="reset-glass overflow-hidden border-secondary/40 p-6 sm:p-8">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Morning check-in
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
            {timeOfDayGreeting(now)},{" "}
            {resolveDisplayName(state.settings?.name, state.settings?.email) ?? "friend"}{" "}
            {greetingEmoji(now)}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
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

        <div className="mt-5">
          <CheckInProgress step={step} maxReached={maxReached} onStep={goTo} />
        </div>

        <Card className="reset-glass mt-4 border-secondary/40 p-6 sm:p-8">
          {loading ? (
            <div className="flex items-center gap-3 py-6 text-[15px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your check-in…
            </div>
          ) : step === 0 ? (
            <StepArrive
              mood={mood}
              onMood={setMood}
              captureText={captureText}
              onCaptureText={setCaptureText}
              onContinue={handleArriveContinue}
              busy={generating}
            />
          ) : generating && !payload ? (
            <div className="flex items-center gap-3 py-10 text-[15px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carey is reflecting…
            </div>
          ) : error && !payload ? (
            <div className="py-4">
              <p className="text-[15px] text-destructive">{error}</p>
              <Button size="sm" className="mt-3" onClick={regenerate}>Try again</Button>
            </div>
          ) : payload ? (
            step === 1 ? (
              <StepNoticed
                payload={payload}
                generating={generating}
                onBack={() => goTo(0)}
                onContinue={() => goTo(2)}
                onRegenerate={regenerate}
              />
            ) : step === 2 ? (
              <StepBuild
                payload={payload}
                iso={iso}
                intention={intention}
                onIntention={setLocalIntention}
                onPayload={(next) => { void update({ ai_payload: next }); }}
                onBack={() => goTo(1)}
                onContinue={() => goTo(3)}
              />
            ) : (
              <StepClose
                payload={payload}
                gratitude={gratitude}
                onGratitude={setGratitude}
                onSaveMantra={() => {
                  void update({ saved_mantra: payload.mantra });
                  toast.success("Saved to favorites");
                }}
                onBack={() => goTo(2)}
                onComplete={handleComplete}
                completing={completing}
              />
            )
          ) : null}
        </Card>

        <p className="mt-6 text-center text-[13px] italic text-muted-foreground">
          Tonight you'll be invited to reflect on how today unfolded.
        </p>
      </div>
    </div>
  );
}