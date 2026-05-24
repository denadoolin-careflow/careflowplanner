import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Check, ChevronRight, Heart, Leaf, Sparkles, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCareProfile, SEASON_META, ALL_PILLARS, PILLAR_META,
  DEFAULT_MVP_ITEMS, type Season, type Pillar,
} from "@/lib/care-methodology";

const STEPS = ["Welcome", "Season", "Minimum Day", "Top Style", "Pillars"] as const;

export default function Onboarding() {
  const nav = useNavigate();
  const { profile, save } = useCareProfile();
  const [step, setStep] = useState(0);
  const [season, setSeason] = useState<Season | null>(profile.season);
  const [mvp, setMvp] = useState<string[]>(profile.mvp_items?.length ? profile.mvp_items : DEFAULT_MVP_ITEMS);
  const [topN, setTopN] = useState<number>(profile.top_n || 3);
  const [pillars, setPillars] = useState<Pillar[]>(profile.pillars_enabled?.length ? profile.pillars_enabled : ALL_PILLARS);
  const [draftItem, setDraftItem] = useState("");

  const finish = async () => {
    await save({
      season,
      top_n: topN,
      mvp_items: mvp,
      pillars_enabled: pillars,
      pillars_order: pillars,
      completed_at: new Date().toISOString(),
    });
    nav("/care", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* atmospheric glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[520px] w-[520px] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10 sm:px-8">
        {/* progress dots */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/60" : "w-4 bg-muted",
              )}
            />
          ))}
        </div>

        <Card className="cozy-card flex-1 border-border/40 bg-card/70 p-7 backdrop-blur sm:p-10">
          {step === 0 && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Welcome to CareFlow</p>
              <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                CareFlow was built for real life.
              </h1>
              <p className="mx-auto max-w-md text-sm text-muted-foreground sm:text-base">
                A calm planner for caregivers, overwhelmed minds, and busy households — without pressure, guilt, or perfectionism.
              </p>
              <div className="mx-auto max-w-md rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">The CARE Loop</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li><strong className="text-foreground">Capture</strong> — get it out of your head</li>
                  <li><strong className="text-foreground">Anchor</strong> — choose what matters today</li>
                  <li><strong className="text-foreground">Rhythm</strong> — move through the day with support</li>
                  <li><strong className="text-foreground">Exhale</strong> — close loops and soften the landing</li>
                </ul>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 2 · Your season</p>
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">Where are you right now?</h2>
                <p className="mt-1 text-sm text-muted-foreground">No wrong answer. We'll soften everything to match.</p>
              </div>
              <div className="space-y-2.5">
                {(Object.keys(SEASON_META) as Season[]).map((s) => {
                  const meta = SEASON_META[s];
                  const active = season === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSeason(s); setTopN(meta.topN); }}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        active
                          ? "border-primary/60 bg-primary/10 shadow-[0_0_18px_-4px_hsl(var(--primary)/0.4)]"
                          : "border-border/60 bg-card/60 hover:bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-lg font-semibold">{meta.label}</p>
                          <p className="text-sm text-muted-foreground">{meta.tagline}</p>
                        </div>
                        {active && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 3 · Minimum viable day</p>
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">Your floor, not your ceiling.</h2>
                <p className="mt-1 text-sm text-muted-foreground">On heavy days, just these are enough.</p>
              </div>
              <ul className="space-y-2">
                {mvp.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                    <Leaf className="h-4 w-4 text-primary/70" />
                    <Input
                      value={item}
                      onChange={(e) => setMvp((arr) => arr.map((v, j) => j === i ? e.target.value : v))}
                      className="h-8 border-0 bg-transparent px-1 focus-visible:ring-0"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMvp((a) => a.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an anchor (e.g. take meds)"
                  value={draftItem}
                  onChange={(e) => setDraftItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draftItem.trim()) {
                      setMvp((a) => [...a, draftItem.trim()]);
                      setDraftItem("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => { if (draftItem.trim()) { setMvp((a) => [...a, draftItem.trim()]); setDraftItem(""); } }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 4 · Top style</p>
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">How many priorities feel right?</h2>
                <p className="mt-1 text-sm text-muted-foreground">You can change this anytime.</p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[2, 3, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTopN(n)}
                    className={cn(
                      "flex flex-col items-center rounded-2xl border p-5 transition-all",
                      topN === n
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 bg-card/60 hover:bg-card",
                    )}
                  >
                    <span className="font-display text-3xl font-semibold">{n}</span>
                    <span className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Top {n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Step 5 · Your pillars</p>
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">Pick what to focus on.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Turn off what you don't need. Add them back anytime.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ALL_PILLARS.map((p) => {
                  const meta = PILLAR_META[p];
                  const on = pillars.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPillars((arr) => on ? arr.filter((x) => x !== p) : [...arr, p])}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                        on ? "border-primary/55 bg-primary/10" : "border-border/60 bg-card/60 hover:bg-card",
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                      )}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? nav("/today") : setStep((s) => s - 1))}
          >
            {step === 0 ? "Skip for now" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !season}
              className="gap-1"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} className="gap-1">
              <Sparkles className="h-4 w-4" /> Begin CareFlow
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}