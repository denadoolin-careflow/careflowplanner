import { Link } from "react-router-dom";
import {
  ArrowRight, Check, Sparkles, Heart, Sprout, Calendar,
  Moon, UtensilsCrossed, Home, Wallet, NotebookPen, Users, Quote,
} from "lucide-react";
import botanical from "@/assets/landing-botanical.png";
import storyImg from "@/assets/landing-story.jpg";
import { CaregiverArchetypeQuiz } from "@/components/quiz/CaregiverArchetypeQuiz";
import { CareFlowLogo } from "@/components/widgets/CareFlowLogo";
import { SeasonalDropIcon } from "@/components/ui/SeasonalDropIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- helpers ---------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
      <SeasonalDropIcon size={12} />
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <div className="mb-3 flex justify-center"><Eyebrow>{eyebrow}</Eyebrow></div>
      <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">{sub}</p>}
    </div>
  );
}

function CreamCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[var(--shadow-cozy)] sm:p-7",
      className,
    )}>
      {children}
    </div>
  );
}

/* ---------------- sections ---------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <CareFlowLogo size={30} showWordmark />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/75 md:flex">
          <a href="#method" className="hover:text-primary">The Method</a>
          <a href="#features" className="hover:text-primary">Features</a>
          <a href="#quiz" className="hover:text-primary">Quiz</a>
          <Link to="/pricing" className="hover:text-primary">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="seasonal" size="sm">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 45% at 82% 12%, hsl(var(--season-summer) / 0.16), transparent 60%), radial-gradient(50% 40% at 12% 30%, hsl(var(--season-forest) / 0.12), transparent 60%)",
        }}
      />
      <img
        src={botanical}
        alt=""
        aria-hidden
        loading="eager"
        className="pointer-events-none absolute -left-16 -top-10 h-[420px] w-[420px] opacity-40 mix-blend-multiply"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:items-center md:py-24">
        <div className="animate-fade-in">
          <Eyebrow>Plan · Care · Grow</Eyebrow>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] text-foreground sm:text-5xl md:text-6xl">
            Plan with intention.<br />
            <span className="text-gradient-seasonal">Care with heart.</span><br />
            Grow every day.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            A warm planner for caregivers, parents, and busy minds — built to soften your days
            without pressure, guilt, or perfectionism.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="seasonal" size="lg">
              <Link to="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/quiz">Take the caregiver quiz</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Free to start</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No pressure, no streaks</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Made for real life</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.22), transparent 70%)" }}
          />
          <SeasonalDropIcon size={320} className="drop-shadow-[0_20px_40px_rgba(120,80,40,0.15)]" animated />

          {/* floating glass cards */}
          <div className="absolute -left-2 top-4 hidden animate-fade-in rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[var(--shadow-cozy)] backdrop-blur sm:block">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Heart className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Care</p>
                <p className="text-sm font-semibold text-foreground">Refill mom's Rx</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-2 top-1/2 hidden animate-fade-in rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[var(--shadow-cozy)] backdrop-blur sm:block">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-primary"><Moon className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Tonight</p>
                <p className="text-sm font-semibold text-foreground">Waxing crescent</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-2 left-6 hidden animate-fade-in rounded-2xl border border-border/60 bg-card/95 p-3 shadow-[var(--shadow-cozy)] backdrop-blur sm:block">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15 text-accent-foreground"><Sprout className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Today</p>
                <p className="text-sm font-semibold text-foreground">3 gentle anchors</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    "Built for caregivers",
    "Loved by busy parents",
    "Soft on your worst days",
    "Kind to your best ones",
  ];
  return (
    <section className="border-y border-border/40 bg-secondary-soft/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80 sm:text-sm">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <SeasonalDropIcon size={14} />
            {it}
          </span>
        ))}
      </div>
    </section>
  );
}

const METHOD = [
  { key: "Capture", body: "Get everything out of your head into one calm place.", tint: "155 45% 32%" },
  { key: "Anchor",  body: "Choose what actually matters today — no more.", tint: "18 85% 55%" },
  { key: "Rhythm",  body: "Move through the day with supportive time blocks.", tint: "175 65% 45%" },
  { key: "Exhale",  body: "Close loops. Soften the landing. Rest without guilt.", tint: "245 45% 55%" },
];

function Method() {
  return (
    <section id="method" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionHeader
        eyebrow="The CareFlow Method"
        title={<>A gentle loop for <span className="text-gradient-seasonal">real life</span>.</>}
        sub="Not a productivity system. A rhythm you can return to on any day — even hard ones."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METHOD.map((m, i) => (
          <CreamCard key={m.key} className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `hsl(${m.tint} / 0.1)` }}>
              <SeasonalDropIcon size={40} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step {i + 1}</p>
            <h3 className="mt-1 font-display text-2xl text-foreground">{m.key}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
          </CreamCard>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Calendar, label: "Today & Planner", body: "One warm command center for your day, week, and month." },
  { icon: Heart, label: "Care", body: "Track meds, appointments, and loved ones with kindness." },
  { icon: Home, label: "Home Reset", body: "Zone-based checklists that meet you where the mess is." },
  { icon: UtensilsCrossed, label: "Meals", body: "Weekly plans, pantry, and grocery — without decision fatigue." },
  { icon: Moon, label: "Cosmic & Cycle", body: "Ride your rhythm with moon phases, cycle, and energy cues." },
  { icon: NotebookPen, label: "Journal & Notes", body: "Cozy prompts, guided reflection, and quiet daily wins." },
];

function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionHeader
        eyebrow="Every corner of your life"
        title={<>One planner. <span className="text-gradient-seasonal">Every layer of care.</span></>}
        sub="Modular flows for the whole household — you only turn on what you need."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <CreamCard key={f.label}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-brand text-lg font-bold text-foreground">{f.label}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </CreamCard>
        ))}
      </div>
    </section>
  );
}

function StoryBand() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 shadow-[var(--shadow-cozy)]">
          <img src={storyImg} alt="Warm cozy planner with tea and plant" loading="lazy" className="h-full w-full object-cover" />
        </div>
        <div>
          <Eyebrow>Our promise</Eyebrow>
          <Quote className="mt-5 h-10 w-10 text-primary/40" />
          <blockquote className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            "Built for the days when you're doing everything — and the days when
            <span className="text-gradient-seasonal"> doing enough is enough.</span>"
          </blockquote>
          <p className="mt-6 text-base text-muted-foreground">
            CareFlow was born from lived experience: caring for aging parents, small kids, and a full
            mental load. It's the planner we needed — and now it's yours.
          </p>
        </div>
      </div>
    </section>
  );
}

function QuizSection() {
  return (
    <section id="quiz" className="mx-auto max-w-4xl px-5 py-20 md:py-24">
      <SectionHeader
        eyebrow="Caregiver archetype"
        title="Which kind of carer are you?"
        sub="A 90-second quiz to shape your planner around the way you actually give."
      />
      <div className="overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-[var(--shadow-cozy)]">
        <div className="h-1 w-full bg-gradient-seasonal" />
        <CaregiverArchetypeQuiz embedded />
      </div>
    </section>
  );
}

function PricingPeek() {
  const plans = [
    { name: "Free", price: "$0", tagline: "For getting started.", features: ["Today, Planner & Inbox", "1 household", "Home Reset zones", "Journal & notes"], cta: "Start free", recommended: false },
    { name: "Plus", price: "$8", suffix: "/mo", tagline: "For the whole household.", features: ["Everything in Free", "AI planning & Carey", "Cosmic + Cycle flows", "Family sharing", "Unlimited history"], cta: "Try Plus", recommended: true },
  ];
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 md:py-24">
      <SectionHeader
        eyebrow="Pricing"
        title="Kind, simple, and honest."
        sub="Free forever for the basics. Upgrade when you're ready for the full flow."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "relative rounded-3xl border p-7 shadow-[var(--shadow-soft)]",
              p.recommended ? "border-primary/40 bg-card ring-seasonal" : "border-border/60 bg-card",
            )}
          >
            {p.recommended && (
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-seasonal px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md">Recommended</span>
            )}
            <p className="font-brand text-sm font-bold uppercase tracking-widest text-primary">{p.name}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-5xl text-foreground">{p.price}</span>
              {p.suffix && <span className="text-sm text-muted-foreground">{p.suffix}</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
            <ul className="mt-6 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild variant={p.recommended ? "seasonal" : "secondary"} className="mt-7 w-full">
              <Link to="/auth">{p.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-seasonal opacity-95" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.35),transparent_60%)]" />
      <div className="mx-auto max-w-3xl px-5 text-center">
        <SeasonalDropIcon size={72} monochrome className="mx-auto mb-6 text-white [&_path]:!stroke-white" />
        <h2 className="font-display text-4xl leading-tight text-white sm:text-5xl">
          Plan with intention.<br />Care with heart.<br />Grow every day.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-white/90">
          Join the caregivers, parents, and busy minds already building calmer days with CareFlow.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="bg-white text-primary hover:bg-white/95">
            <Link to="/auth">Start your CareFlow <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 sm:flex-row">
        <CareFlowLogo size={28} showWordmark showTagline />
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link to="/pricing" className="hover:text-primary">Pricing</Link>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
          <Link to="/terms" className="hover:text-primary">Terms</Link>
          <span className="text-xs">© {new Date().getFullYear()} CareFlow</span>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Method />
        <FeatureBento />
        <StoryBand />
        <QuizSection />
        <PricingPeek />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
