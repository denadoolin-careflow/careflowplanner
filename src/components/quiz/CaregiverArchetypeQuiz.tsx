import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Heart, Sparkles, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ARCHETYPES, QUESTIONS, IDENTITIES,
  scoreQuiz, saveQuizResult, saveQuizResultRemote, syncQuizResult,
  saveQuizProgress, loadQuizProgress, clearQuizProgress,
  getArchetype, PLANNING_STYLE_LABEL,
  type Identity, type QuizAnswers, type Archetype,
} from "@/lib/archetype-quiz";
import { setAtmosphere, getAtmosphere } from "@/lib/atmospheres";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Stage = "welcome" | "identity" | "quiz" | "result";

export function CaregiverArchetypeQuiz({ embedded = false }: { embedded?: boolean }) {
  const nav = useNavigate();
  const { user } = useStore();

  const [stage, setStage] = useState<Stage>("welcome");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [qIdx, setQIdx] = useState(0);
  const [result, setResult] = useState<Archetype | null>(null);
  const [recommendedAtmo, setRecommendedAtmo] = useState<string | null>(null);

  // restore in-progress
  useEffect(() => {
    const prev = loadQuizProgress();
    if (prev && Object.keys(prev.answers).length > 0) {
      setIdentity(prev.identity);
      setAnswers(prev.answers);
      setQIdx(Math.min(prev.step ?? 0, QUESTIONS.length - 1));
      setStage("quiz");
    }
  }, []);

  // hydrate / sync result with the database when signed in
  useEffect(() => {
    let cancelled = false;
    syncQuizResult().then((r) => {
      if (cancelled || !r) return;
      // only show synced result if user hasn't started a fresh attempt
      if (Object.keys(answers).length === 0 && stage === "welcome") {
        const a = getArchetype(r.archetype);
        setResult(a);
        setRecommendedAtmo(r.atmosphere);
        setIdentity(r.identity);
        if (r.answers) setAnswers(r.answers);
        setStage("result");
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // autosave progress
  useEffect(() => {
    if (stage === "quiz") saveQuizProgress({ identity, answers, step: qIdx });
  }, [stage, identity, answers, qIdx]);

  const total = QUESTIONS.length;
  const progress = stage === "quiz"
    ? (Object.keys(answers).length / total) * 100
    : stage === "result" ? 100 : 0;

  function handlePickIdentity(id: Identity) {
    setIdentity(id);
    setStage("quiz");
    setQIdx(0);
  }

  function handleAnswer(qid: string, optIdx: number) {
    const next = { ...answers, [qid]: optIdx };
    setAnswers(next);
    setTimeout(() => {
      if (qIdx < total - 1) setQIdx(qIdx + 1);
      else finish(next);
    }, 220);
  }

  function finish(finalAnswers: QuizAnswers) {
    const { archetype, atmosphereVote } = scoreQuiz(finalAnswers);
    setResult(archetype);
    const atmo = atmosphereVote ?? archetype.atmosphere;
    setRecommendedAtmo(atmo);
    const payload = {
      archetype: archetype.id,
      identity,
      atmosphere: atmo as any,
      planningStyle: archetype.planningStyle,
      takenAt: new Date().toISOString(),
      answers: finalAnswers,
    };
    saveQuizResult(payload);
    void saveQuizResultRemote(payload);
    clearQuizProgress();
    setStage("result");
  }

  function restart() {
    clearQuizProgress();
    setAnswers({});
    setQIdx(0);
    setResult(null);
    setIdentity(null);
    setStage("welcome");
  }

  function applyAndEnter() {
    if (recommendedAtmo) setAtmosphere(recommendedAtmo as any);
    toast.success("Your CareFlow has been personalized.", { description: "Welcome home." });
    if (user) nav("/dashboard");
    else nav("/auth");
  }

  const wrap = embedded ? "" : "min-h-screen";

  return (
    <div className={cn("relative overflow-hidden", wrap)}>
      {/* soft floating particles + gradients */}
      <BackgroundAtmosphere hue={result?.hue} />

      <div className="relative mx-auto flex w-full max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-14">
        {/* progress + back */}
        {stage !== "welcome" && stage !== "result" && (
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => {
                if (stage === "identity") setStage("welcome");
                else if (stage === "quiz" && qIdx > 0) setQIdx(qIdx - 1);
                else if (stage === "quiz") setStage("identity");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/60 text-muted-foreground backdrop-blur transition hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(8, progress)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {stage === "quiz" ? `${qIdx + 1}/${total}` : ""}
            </span>
          </div>
        )}

        {stage === "welcome" && <WelcomeScreen onStart={() => setStage("identity")} />}
        {stage === "identity" && (
          <IdentityScreen onPick={handlePickIdentity} onSkip={() => handlePickIdentity("private")} />
        )}
        {stage === "quiz" && (
          <QuestionScreen
            qIdx={qIdx}
            selectedIdx={answers[QUESTIONS[qIdx].id]}
            onAnswer={handleAnswer}
          />
        )}
        {stage === "result" && result && (
          <ResultScreen
            archetype={result}
            recommendedAtmo={recommendedAtmo ?? result.atmosphere}
            isAuthed={!!user}
            onApply={applyAndEnter}
            onRetake={restart}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────── pieces ───────────── */

function BackgroundAtmosphere({ hue }: { hue?: [string, string] }) {
  const [a, b] = hue ?? ["152 28% 76%", "340 60% 86%"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-48 -left-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-60 animate-[float_18s_ease-in-out_infinite]"
        style={{ background: `hsl(${a} / 0.55)` }}
      />
      <div
        className="absolute -bottom-40 -right-24 h-[560px] w-[560px] rounded-full blur-3xl opacity-50 animate-[float_22s_ease-in-out_infinite_reverse]"
        style={{ background: `hsl(${b} / 0.55)` }}
      />
      {/* botanical particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute block h-1.5 w-1.5 rounded-full bg-foreground/15"
          style={{
            top: `${(i * 53) % 100}%`,
            left: `${(i * 37 + 7) % 100}%`,
            animation: `drift ${10 + (i % 7)}s ease-in-out infinite ${i * 0.3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-30px)} }
        @keyframes drift { 0%,100%{transform:translate(0,0); opacity:.25} 50%{transform:translate(15px,-20px); opacity:.6} }
      `}</style>
    </div>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-3xl border border-white/40 bg-card/60 p-7 shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.25)] backdrop-blur-xl",
      "dark:border-white/10 dark:bg-card/40 sm:p-10",
      className,
    )}>
      {children}
    </div>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <GlassCard className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 ring-1 ring-white/40">
        <Heart className="h-6 w-6 text-primary" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">CareFlow · Archetype Quiz</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
        Care starts with understanding how you move through life.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Find your caregiver archetype and discover a planning rhythm designed for your real energy,
        responsibilities, and nervous system.
      </p>
      <Button
        size="lg"
        onClick={onStart}
        className="mt-7 h-12 rounded-full bg-gradient-to-r from-primary to-accent px-7 text-base shadow-lg hover:opacity-95"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Start Quiz
      </Button>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Takes ~2 minutes · no account needed
      </p>
    </GlassCard>
  );
}

function IdentityScreen({
  onPick, onSkip,
}: { onPick: (id: Identity) => void; onSkip: () => void }) {
  return (
    <GlassCard>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Step 1 of 2</p>
      <h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
        Which of these feels closest to you?
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Choose any that fits — this shapes the language we'll use, not your result.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {IDENTITIES.map(opt => (
          <button
            key={opt.id}
            onClick={() => onPick(opt.id)}
            className="group flex items-center gap-2 rounded-2xl border border-border/50 bg-background/60 px-3.5 py-3 text-left text-sm transition hover:border-primary/60 hover:bg-primary/5 hover:shadow-sm"
          >
            <span className="text-lg" aria-hidden>{opt.emoji}</span>
            <span className="font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onSkip} className="mt-5 text-xs text-muted-foreground underline-offset-4 hover:underline">
        Skip — go straight to the quiz
      </button>
    </GlassCard>
  );
}

function QuestionScreen({
  qIdx, selectedIdx, onAnswer,
}: {
  qIdx: number;
  selectedIdx: number | undefined;
  onAnswer: (qid: string, optIdx: number) => void;
}) {
  const q = QUESTIONS[qIdx];
  return (
    <GlassCard>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Question {qIdx + 1}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">
        {q.prompt}
      </h2>
      {q.helper && <p className="mt-1.5 text-sm text-muted-foreground">{q.helper}</p>}

      <div className="mt-6 space-y-2">
        {q.options.map((opt, i) => {
          const active = selectedIdx === i;
          return (
            <button
              key={i}
              onClick={() => onAnswer(q.id, i)}
              className={cn(
                "group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all",
                "border-border/50 bg-background/60 hover:border-primary/60 hover:bg-primary/5",
                active && "border-primary bg-primary/10 shadow-sm",
              )}
            >
              <span className="text-sm font-medium leading-snug sm:text-[15px]">{opt.label}</span>
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/80",
              )}>
                {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
              </span>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

function ResultScreen({
  archetype, recommendedAtmo, isAuthed, onApply, onRetake,
}: {
  archetype: Archetype;
  recommendedAtmo: string;
  isAuthed: boolean;
  onApply: () => void;
  onRetake: () => void;
}) {
  const atmo = getAtmosphere(recommendedAtmo as any);
  return (
    <div className="space-y-5">
      <GlassCard>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Your archetype</p>
        <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          {archetype.title}
        </h2>
        <p className="mt-1 font-display text-base italic text-muted-foreground">
          "{archetype.quote}"
        </p>
        <p className="mt-5 text-[15px] leading-relaxed">{archetype.description}</p>

        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
            Nervous-system insight
          </p>
          <p className="mt-1 text-sm leading-relaxed">{archetype.insight}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoBlock label="Planning style" value={PLANNING_STYLE_LABEL[archetype.planningStyle]} />
          <InfoBlock
            label="Atmosphere"
            value={atmo.name}
            swatch={atmo.palette[0]}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ChipList label="Suggested dashboard" items={archetype.dashboard} />
          <ChipList label="Recommended routines" items={archetype.routines} />
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-accent/15 to-primary/10 p-4 text-center">
          <p className="font-display text-lg italic">"{archetype.affirmation}"</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Button
            size="lg"
            onClick={onApply}
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-primary to-accent text-base shadow-lg hover:opacity-95"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isAuthed ? archetype.ctaLabel : "Save my result & continue"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onRetake}
            className="h-12 rounded-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Retake
          </Button>
        </div>

        {!isAuthed && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Create a free account next to save your archetype and personalize your CareFlow.
          </p>
        )}
      </GlassCard>

      <details className="rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-md">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          Explore other archetypes
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ARCHETYPES.filter(a => a.id !== archetype.id).map(a => (
            <div key={a.id} className="rounded-xl border border-border/40 bg-background/50 p-3">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="mt-0.5 text-xs italic text-muted-foreground">"{a.quote}"</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function InfoBlock({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-medium">
        {swatch && <span className="h-3 w-3 rounded-full ring-1 ring-border" style={{ background: swatch }} />}
        {value}
      </p>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map(i => (
          <span key={i} className="rounded-full bg-muted/70 px-2.5 py-0.5 text-[11px]">{i}</span>
        ))}
      </div>
    </div>
  );
}