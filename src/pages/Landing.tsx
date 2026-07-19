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

/* ---------- Local presentational helpers ---------- */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] backdrop-blur transition-colors duration-700"
      style={{
        background: "var(--atmos-pill-bg, hsl(145 35% 92% / 0.8))",
        borderColor: "var(--atmos-pill-border, hsl(145 22% 70% / 0.5))",
        color: "var(--atmos-pill-text, hsl(145 30% 22%))",
      }}
    >
      {children}
    </span>
  );
}

function GlassCard({
  className = "",
  children,
}: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-border/50 bg-card/70 p-5 shadow-[0_8px_30px_-12px_hsl(258_30%_50%/0.18)] backdrop-blur-md sm:rounded-3xl sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function PrimaryCTA({ to = "/auth", children }: { to?: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium shadow-cozy transition-all duration-700 hover:scale-[1.02] hover:brightness-110"
      style={{
        background: "hsl(145 28% 32%)",
        color: "hsl(36 55% 96%)",
      }}
    >
      {children}
    </Link>
  );
}

function SecondaryCTA({ to = "/quiz", children }: { to?: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium backdrop-blur transition-colors"
      style={{
        background: "hsl(36 55% 96%)",
        color: "hsl(145 28% 24%)",
        borderColor: "hsl(145 25% 55% / 0.45)",
      }}
    >
      {children}
    </Link>
  );
}

/* ---------- Hero mockup (pure CSS preview of the app) ---------- */

function HeroMockup() {
  return (
    <div className="relative">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-[3rem] opacity-70 blur-3xl"
        style={{ background: "radial-gradient(60% 60% at 60% 40%, hsl(145 35% 80% / 0.5), transparent 60%), radial-gradient(40% 40% at 30% 70%, hsl(350 55% 90% / 0.5), transparent 60%)" }}
      />

      {/* Desktop card */}
      <div className="relative rounded-3xl border border-border/60 bg-card/80 p-3 shadow-[0_30px_80px_-40px_hsl(258_30%_40%/0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <span className="h-2 w-2 rounded-full bg-rose-300/70" />
          <span className="h-2 w-2 rounded-full bg-amber-300/70" />
          <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
        </div>
        <div className="grid grid-cols-[140px_1fr_180px] gap-2 rounded-2xl bg-background/80 p-3">
          {/* sidebar */}
          <div className="space-y-1.5 rounded-xl bg-card/70 p-2 text-[10px]">
            <div className="mb-1.5 px-1 text-[9px] uppercase tracking-widest text-muted-foreground">CareFlow</div>
            {["Inbox","Today","Upcoming","Anytime","Someday","Logbook"].map((l, i) => (
              <div key={l} className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${i===1?"bg-secondary-soft text-secondary-foreground":""}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-secondary/60" />
                {l}
              </div>
            ))}
            <div className="mt-2 px-1 text-[9px] uppercase tracking-widest text-muted-foreground">Favorites</div>
            {["Family Outings","Self-care"].map(l => (
              <div key={l} className="flex items-center gap-1.5 px-1.5 py-1">
                <Heart className="h-2.5 w-2.5 text-accent" />{l}
              </div>
            ))}
          </div>
          {/* main */}
          <div className="space-y-2">
            <div className="rounded-xl bg-card/70 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Welcome to CareFlow</div>
              <div className="font-display text-sm text-foreground">CareFlow was built for real life.</div>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                A calm planner for caregivers, overwhelmed minds, and busy households — without pressure, guilt, or perfectionism.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/60 p-2 text-[10px]">
              <div className="font-display text-[11px] text-foreground">THE CARE LOOP</div>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li><b className="text-foreground">Capture</b> — get it out of your head</li>
                <li><b className="text-foreground">Anchor</b> — choose what matters today</li>
                <li><b className="text-foreground">Rhythm</b> — move through the day</li>
                <li><b className="text-foreground">Exhale</b> — close loops softly</li>
              </ul>
            </div>
          </div>
          {/* right rail */}
          <div className="space-y-2 text-[10px]">
            <div className="rounded-xl bg-card/70 p-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Today</div>
              <div className="mt-0.5 flex items-center gap-1.5"><Check className="h-2.5 w-2.5 text-secondary" /> 4 tasks</div>
              <div className="flex items-center gap-1.5"><Calendar className="h-2.5 w-2.5 text-moon" /> 2 events</div>
            </div>
            <div className="rounded-xl bg-secondary-soft/70 p-2">
              <div className="text-[9px] uppercase tracking-widest text-secondary-foreground/70">Top priority</div>
              <div className="mt-0.5 text-foreground">Plan meals for the week</div>
            </div>
            <div className="rounded-xl bg-accent-soft/70 p-2">
              <div className="text-[9px] uppercase tracking-widest text-accent-foreground/70">Energy</div>
              <div className="mt-0.5 text-foreground">Medium</div>
              <div className="text-muted-foreground">You have 2–3 hrs of focused energy.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating phone */}
      <div className="absolute -bottom-10 -right-4 hidden w-[180px] rotate-[3deg] rounded-[2rem] border border-border/60 bg-card/90 p-2 shadow-cozy backdrop-blur-xl sm:block">
        <div className="rounded-[1.5rem] bg-background/90 p-3">
          <div className="mb-1 text-[9px] text-muted-foreground">5:37 PM</div>
          <div className="font-display text-[11px] text-foreground">Today</div>
          <p className="mt-1 text-[9px] leading-snug text-muted-foreground">
            CareFlow was built for real life. A calm planner for caregivers and busy households.
          </p>
          <div className="mt-2 space-y-1">
            {["Capture","Anchor","Rhythm","Exhale"].map(l => (
              <div key={l} className="flex items-center gap-1.5 rounded-md bg-secondary-soft/60 px-1.5 py-1 text-[9px]">
                <Check className="h-2.5 w-2.5 text-secondary-foreground/70" /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Hero Today Preview card (animated + interactive) ---------- */

function PreviewPanel() {
  type DemoTask = { id: string; label: string; tag: "Morning" | "Afternoon" | "Evening"; done: boolean; glow: string };
  const STORAGE_KEY = "careflow.demoTasks";
  const seed: DemoTask[] = [
    { id: "s1", label: "Pack lunches", tag: "Morning", done: true, glow: "bg-secondary/30" },
    { id: "s2", label: "Call dentist for kids", tag: "Morning", done: false, glow: "bg-accent/20" },
    { id: "s3", label: "Grocery run — veggies", tag: "Afternoon", done: false, glow: "bg-moon/20" },
    { id: "s4", label: "15-min reset tidy", tag: "Evening", done: false, glow: "bg-warm/20" },
  ];

  const [tasks, setTasks] = useState<DemoTask[]>(seed);
  const [input, setInput] = useState("");
  const [burstId, setBurstId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live clock — updates each minute so the preview always reflects "now".
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Live moon phase for today.
  const moonInfo = MOON_INFO[getMoonPhase(now)];
  const moonIllum = getIllumination(now);

  // Live weather — uses saved location, else silently tries geolocation,
  // else falls back to a default city so the preview is always populated.
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    const FALLBACK = { name: "New York, NY", lat: 40.7128, lon: -74.006 };
    const load = async (lat: number, lon: number, label: string) => {
      try {
        const snap = await fetchWeather(lat, lon, label);
        if (!cancelled) setWeather(snap);
      } catch {/* noop */}
    };
    const saved = loadSavedPlace();
    if (saved) { void load(saved.lat, saved.lon, saved.name); return () => { cancelled = true; }; }
    if (!("geolocation" in navigator)) {
      void load(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
      return () => { cancelled = true; };
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = "Your area";
        try { label = await reverseLabel(latitude, longitude); } catch {}
        if (!cancelled) void load(latitude, longitude, label);
      },
      () => { if (!cancelled) void load(FALLBACK.lat, FALLBACK.lon, FALLBACK.name); },
      { timeout: 4000, maximumAge: 10 * 60 * 1000 },
    );
    return () => { cancelled = true; };
  }, []);

  const WeatherIcon = (() => {
    const c: WeatherCondition | undefined = weather?.condition;
    if (!c) return Sun;
    if (c === "clear") return weather?.isNight ? Moon : Sun;
    if (c === "partly-cloudy") return CloudSun;
    if (c === "cloudy") return Cloud;
    if (c === "fog") return CloudFog;
    if (c === "drizzle") return CloudDrizzle;
    if (c === "rain") return CloudRain;
    if (c === "snow") return CloudSnow;
    if (c === "thunderstorm") return Zap;
    return Cloud;
  })();
  const tempF = weather ? Math.round(weather.tempC * 9 / 5 + 32) : null;
  const timeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateLabel = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  // Sync user-added tasks to sessionStorage so Today demo banner can show them
  useEffect(() => {
    const userTasks = tasks.filter(t => !t.id.startsWith("s"));
    try {
      if (userTasks.length === 0) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userTasks));
    } catch {}
  }, [tasks]);

  const currentSlot = (): "Morning" | "Afternoon" | "Evening" => {
    const h = new Date().getHours();
    if (h < 12) return "Morning";
    if (h < 17) return "Afternoon";
    return "Evening";
  };

  const addTask = () => {
    const label = input.trim();
    if (!label) return;
    const slot = currentSlot();
    const glow = slot === "Morning" ? "bg-accent/20" : slot === "Afternoon" ? "bg-moon/20" : "bg-warm/20";
    setTasks(prev => [
      ...prev,
      { id: `u${Date.now()}`, label, tag: slot, done: false, glow },
    ]);
    setInput("");
    inputRef.current?.focus();
  };

  const toggle = (id: string) => {
    setTasks(prev => {
      const next = prev.map(t => (t.id === id ? { ...t, done: !t.done } : t));
      const target = next.find(t => t.id === id);
      if (target?.done) {
        setBurstId(id);
        setTimeout(() => setBurstId(null), 700);
      }
      return next;
    });
  };

  return (
    <div
      className="group relative mt-8 block w-full max-w-sm mx-auto sm:max-w-xl lg:max-w-3xl"
      aria-label="Interactive Today preview"
    >
      {/* Glow */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: "radial-gradient(50% 50% at 50% 50%, hsl(145 35% 80% / 0.45), transparent 70%)" }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 shadow-[0_20px_50px_-20px_hsl(258_30%_40%/0.35)] backdrop-blur-xl transition-all duration-500 group-hover:shadow-[0_30px_60px_-15px_hsl(258_30%_40%/0.45)] lg:rounded-3xl">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 lg:px-5 lg:py-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-300/70" />
            <div className="h-2 w-2 rounded-full bg-amber-300/70" />
            <div className="h-2 w-2 rounded-full bg-emerald-300/70" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground lg:text-[11px]" title={weather?.locationLabel ?? "Loading weather…"}>
            <WeatherIcon className="h-3 w-3 text-warm lg:h-3.5 lg:w-3.5" />
            <span className="tabular-nums">{tempF !== null ? `${tempF}°` : "—°"}</span>
            {weather?.locationLabel && (
              <span className="hidden sm:inline truncate max-w-[10rem] opacity-70">· {weather.locationLabel}</span>
            )}
            <span className="ml-1 rounded-full bg-secondary-soft/60 px-1.5 py-0.5 text-[9px] text-secondary-foreground tabular-nums lg:text-[10px]">
              {timeLabel}
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2.5 lg:p-5 lg:space-y-3.5">
          {/* Date */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground lg:text-[11px]">Today</div>
              <div className="font-display text-sm text-foreground lg:text-lg">{dateLabel}</div>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full bg-moon/10 px-2 py-1 text-[10px] text-moon-foreground lg:px-3 lg:py-1.5 lg:text-[11px]"
              title={`${moonInfo.label} · ${moonIllum}% illuminated`}
            >
              <span className="text-sm leading-none lg:text-base" aria-hidden>{moonInfo.glyph}</span>
              <span>{moonInfo.label}</span>
              <span className="tabular-nums opacity-70">· {moonIllum}%</span>
            </div>
          </div>

          {/* Mini Rhythm pills */}
          <div className="flex gap-1.5">
            {["Morning", "Afternoon", "Evening"].map((t, i) => (
              <div
                key={t}
                className={`flex-1 rounded-lg px-1.5 py-1 text-[10px] text-center transition-all duration-500 cursor-default lg:py-1.5 lg:text-[12px] ${
                  i === 0 ? "bg-warm/15 text-warm-foreground font-medium" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Quick add */}
          <form
            onSubmit={e => { e.preventDefault(); addTask(); }}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/70 px-2 py-1.5 focus-within:border-secondary/60 focus-within:bg-card transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Quick add a task…"
              aria-label="Quick add task"
              className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/70"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-white transition-all hover:bg-secondary disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {/* Interactive tasks */}
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                <button
                  type="button"
                  onClick={() => toggle(task.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-2 py-1.5 text-left text-[11px] transition-all duration-300 hover:border-border/60 hover:bg-card hover:shadow-sm"
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all duration-300 ${
                      task.done
                        ? "scale-110 border-secondary bg-secondary text-white"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {task.done && <Check className="h-2.5 w-2.5 animate-scale-in" />}
                  </span>
                  <span className={`flex-1 transition-colors duration-300 ${task.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {task.label}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${task.glow} text-foreground/80`}>
                    {task.tag}
                  </span>
                </button>
                {burstId === task.id && (
                  <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                      <span
                        key={i}
                        className="absolute block h-1 w-1 rounded-full bg-secondary"
                        style={{
                          transform: `rotate(${i * 45}deg) translateX(0)`,
                          animation: `preview-burst-${i} 0.6s ease-out forwards`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Meal preview */}
          <div className="flex items-center gap-2 rounded-lg bg-secondary-soft/40 px-2 py-1.5 text-[10px]">
            <Utensils className="h-3 w-3 text-secondary" />
            <span className="text-muted-foreground">Dinner:</span>
            <span className="text-foreground">Roasted chicken + veggies</span>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card/80 to-transparent" />
      </div>
      <style>{`
        ${[0,1,2,3,4,5,6,7].map(i => `
          @keyframes preview-burst-${i} {
            0% { opacity: 1; transform: rotate(${i*45}deg) translateX(0) scale(1); }
            100% { opacity: 0; transform: rotate(${i*45}deg) translateX(20px) scale(0.3); }
          }
        `).join("\n")}
      `}</style>
    </div>
  );
}

/* ---------- Section data ---------- */

const careLoop = [
  { k: "C", title: "Capture", lead: "Get it out of your head.", icon: Sparkles,
    bullets: ["tasks", "groceries", "appointments", "mental load", "notes & reminders"],
    glow: "bg-secondary/40", ink: "text-secondary-foreground/80" },
  { k: "A", title: "Anchor", lead: "Choose what matters today.", icon: Heart,
    bullets: ["top 3 priorities", "minimum viable day", "emotional pacing", "boundaries"],
    glow: "bg-accent/40", ink: "text-accent-foreground/80" },
  { k: "R", title: "Rhythm", lead: "Move through the day with support.", icon: Moon,
    bullets: ["routines", "time blocks", "recurring resets", "gentle reminders"],
    glow: "bg-moon/40", ink: "text-moon-foreground/80" },
  { k: "E", title: "Exhale", lead: "Close loops softly.", icon: Sparkles,
    bullets: ["reflections", "resets", "emotional check-ins", "prepare for tomorrow"],
    glow: "bg-warm/40", ink: "text-warm-foreground/80" },
] as const;

const features = [
  { icon: Home, title: "Home Reset", body: "Cleaning zones, routines, recurring resets." },
  { icon: Brain, title: "Mental Load Support", body: "Brain dump + prioritization." },
  { icon: Utensils, title: "Meal Planning", body: "AI meal plans + grocery sync." },
  { icon: Moon, title: "Moon + Energy Planning", body: "Track energy, lunar cycles, emotional pacing." },
  { icon: Calendar, title: "Calendar + Time Blocking", body: "Drag-and-drop scheduling." },
  { icon: Heart, title: "Caregiver Support", body: "Low-energy mode + gentle reminders." },
  { icon: NotebookPen, title: "Notes + Journaling", body: "Craft-inspired visual editor." },
  { icon: Wallet, title: "Wealth Tracking", body: "Bills, subscriptions, savings goals." },
  { icon: Sparkles, title: "AI Companion", body: "Decision support + overwhelm reduction." },
];

const atmospheres = [
  // Ordered by hue family, light → dark within each family
  { name: "Sage Sanctuary", tone: "Grounded",  icon: Sprout,  bg: "linear-gradient(135deg,hsl(145 32% 84%),hsl(36 45% 94%))", dark: false, accent: "145 30% 28%" },
  { name: "Forest",         tone: "Focused",   icon: Trees,   bg: "linear-gradient(135deg,hsl(150 30% 30%),hsl(150 25% 18%))", dark: true,  accent: "145 40% 70%" },
  { name: "Dark Sage Glass",tone: "Held",      icon: Mountain,bg: "linear-gradient(135deg,hsl(150 18% 22%),hsl(150 15% 12%))", dark: true,  accent: "150 25% 75%" },
  { name: "Soft Linen",     tone: "Warm",      icon: Sun,     bg: "linear-gradient(135deg,hsl(36 55% 92%),hsl(32 45% 86%))", dark: false, accent: "28 55% 38%" },
  { name: "Dawn",           tone: "Hopeful",   icon: Sunrise, bg: "linear-gradient(135deg,hsl(28 75% 80%),hsl(350 60% 88%))", dark: false, accent: "18 65% 42%" },
  { name: "Ember",          tone: "Cozy",      icon: Coffee,  bg: "linear-gradient(135deg,hsl(20 65% 60%),hsl(15 40% 30%))", dark: true,  accent: "30 70% 85%" },
  { name: "Blossom",        tone: "Soft",      icon: Flower2, bg: "linear-gradient(135deg,hsl(350 70% 92%),hsl(36 55% 95%))", dark: false, accent: "340 55% 45%" },
  { name: "Moonlit Plum",   tone: "Dreamy",    icon: Moon,    bg: "linear-gradient(135deg,hsl(280 30% 70%),hsl(260 25% 35%))", dark: true,  accent: "280 50% 88%" },
  { name: "Mist",           tone: "Minimal",   icon: Cloud,   bg: "linear-gradient(135deg,hsl(215 30% 92%),hsl(36 30% 96%))", dark: false, accent: "215 35% 35%" },
  { name: "Coastal Calm",   tone: "Open",      icon: Waves,   bg: "linear-gradient(135deg,hsl(200 55% 82%),hsl(36 40% 94%))", dark: false, accent: "200 60% 32%" },
  { name: "Ocean",          tone: "Steady",    icon: Waves,   bg: "linear-gradient(135deg,hsl(210 55% 55%),hsl(220 50% 25%))", dark: true,  accent: "200 70% 85%" },
  { name: "Midnight",       tone: "Quiet",     icon: Moon,    bg: "linear-gradient(135deg,hsl(240 30% 18%),hsl(260 25% 10%))", dark: true,  accent: "260 50% 82%" },
];

const archetypes = [
  { name: "Mental Load Carrier",   quote: "I'm holding everyone's schedule in my head.",   atmosphere: "Sage Sanctuary" },
  { name: "Burnt-Out Caregiver",   quote: "I forgot what rest even feels like.",            atmosphere: "Soft Linen" },
  { name: "Neurodivergent Navigator", quote: "I need structure that bends with me.",        atmosphere: "Mist" },
  { name: "Gentle Homemaker",      quote: "I want a home that breathes with us.",          atmosphere: "Blossom" },
  { name: "Reset Seeker",          quote: "I'm ready to begin again, softly.",             atmosphere: "Dawn" },
  { name: "Rebuilding Dreamer",    quote: "I'm becoming someone new on purpose.",          atmosphere: "Moonlit Plum" },
  { name: "Moon-Guided Planner",   quote: "I plan in cycles, not straight lines.",         atmosphere: "Midnight" },
];

const stats = [
  { n: "63M+", label: "Adults in the U.S. are caregivers" },
  { n: "76%",  label: "Caregivers experience high stress" },
  { n: "2.5×", label: "More likely to experience burnout" },
  { n: "1 in 4", label: "Caregivers feel lonely and isolated" },
];

const testimonials = [
  { quote: "CareFlow helped me go from surviving to feeling like myself again. The mental load tools are life-changing.", name: "Jasmine R.", role: "Mom of 3" },
  { quote: "As a neurodivergent human, I finally have a system that flows with me instead of against me.", name: "Alex K.", role: "ADHD & Proud" },
  { quote: "The moon & energy planning helped me stop fighting my energy and start honoring it.", name: "Morgan L.", role: "Caregiver" },
  { quote: "I love how gentle everything feels. It's like CareFlow gets me on a soul level.", name: "Tasha M.", role: "Homemaker" },
  { quote: "The best investment I've made for my home, my family, and my peace of mind.", name: "David P.", role: "Father & Provider" },
];

const footerNav = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Archetypes", href: "#archetypes" },
    { label: "Atmospheres", href: "#atmospheres" },
    { label: "Quiz", href: "#quiz" },
    { label: "Pricing", href: "/pricing" },
    { label: "Waitlist", href: "/waitlist" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Guides", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Accessibility", href: "#" },
  ],
  Company: [
    { label: "Our Story", href: "#story" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

/* ---------- Page ---------- */

export default function Landing() {
  // Force light theme on landing regardless of app theme.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    if (had) root.classList.remove("dark");
    return () => { if (had) root.classList.add("dark"); };
  }, []);

  const [activeAtmos, setActiveAtmos] = useState<typeof atmospheres[number] | null>(atmospheres[0]);
  const isDark = !!activeAtmos?.dark;

  // Build accent CSS variables from the chosen atmosphere so pills + CTAs
  // recolor across the whole page.
  const accent = activeAtmos?.accent ?? "145 30% 28%";
  const atmosVars = {
    ["--atmos-cta-bg" as any]: `hsl(${accent})`,
    ["--atmos-cta-fg" as any]: isDark ? "hsl(240 25% 12%)" : "hsl(36 50% 96%)",
    ["--atmos-pill-bg" as any]: isDark
      ? "hsl(0 0% 100% / 0.10)"
      : `hsl(${accent} / 0.14)`,
    ["--atmos-pill-border" as any]: isDark
      ? "hsl(0 0% 100% / 0.25)"
      : `hsl(${accent} / 0.40)`,
    ["--atmos-pill-text" as any]: isDark
      ? "hsl(36 50% 96%)"
      : `hsl(${accent})`,
  } as React.CSSProperties;

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-700 ${isDark ? "text-[hsl(36_50%_96%)]" : "text-foreground"}`}
      style={{
        background: activeAtmos ? activeAtmos.bg : "hsl(36 42% 95%)",
        ...atmosVars,
      }}
    >
      {/* atmosphere tint overlay for readability on dark themes */}
      {isDark && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ background: "linear-gradient(180deg, hsl(0 0% 0% / 0.15), hsl(0 0% 0% / 0.35))" }}
        />
      )}
      {/* ambient gradients */}
      {!activeAtmos && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[900px] -z-10"
            style={{
              background:
                "radial-gradient(60% 50% at 80% 10%, hsl(145 35% 82% / 0.55), transparent 60%), radial-gradient(50% 40% at 10% 20%, hsl(145 30% 78% / 0.5), transparent 60%), linear-gradient(180deg, hsl(36 55% 96%) 0%, hsl(38 40% 92%) 100%)",
            }}
          />
          <img
            src={botanical}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-16 top-24 -z-10 hidden w-[420px] opacity-80 md:block"
          />
        </>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/30 bg-[hsl(36_50%_97%)]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
            <CareFlowMark size={36} className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="leading-tight">
              <span className="font-display text-base font-semibold text-foreground sm:text-lg">CareFlow</span>
              <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">Plan · Care · Grow</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-foreground/80 md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#archetypes" className="hover:text-foreground">Archetypes</a>
            <a href="#atmospheres" className="hover:text-foreground">Atmospheres</a>
            <a href="#quiz" className="hover:text-foreground">Quiz</a>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 transition-colors hover:bg-card sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              to="/waitlist"
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium shadow-cozy transition-all duration-700 hover:scale-[1.02] hover:brightness-110 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
              style={{
                background: "var(--atmos-cta-bg, hsl(145 30% 28%))",
                color: "var(--atmos-cta-fg, hsl(36 50% 96%))",
              }}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">Waitlist</span>
              <span className="hidden sm:inline">Join the Waitlist</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto w-full max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-5 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24">
        <div className="relative mx-auto max-w-xl text-center">
          <Pill><Heart className="h-3 w-3" /> Built for real-life caregivers</Pill>
          <h1 className="mt-5 font-display text-[34px] leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[58px]">
            Turn your daily workload into a{" "}
            <em className="not-italic text-[hsl(28_70%_45%)]">gentle loop</em>{" "}
            you can repeat.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground mx-auto sm:mt-5 sm:text-base">
            CareFlow is the emotionally intelligent planning system for caregivers, overwhelmed minds, neurodivergent users, and busy households — without pressure, guilt, or perfectionism.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
            <PrimaryCTA><CareFlowMark size={18} rounded="md" /> Start Your CareFlow</PrimaryCTA>
            <SecondaryCTA><Sparkles className="h-4 w-4" /> Find Your Archetype</SecondaryCTA>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> All-in-one planner</span>
            <span className="inline-flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Mental load support</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI companion</span>
          </div>
          <p className="mt-5 text-xs italic text-muted-foreground/80">
            No pressure. No perfectionism. Just support.
          </p>
        </div>

        {/* Centered Preview Panel */}
        <div className="mt-8 flex flex-col items-center sm:mt-10">
          <PreviewPanel />
          <Link
            to="/today"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 transition-all duration-300 hover:bg-card hover:shadow-md hover:scale-[1.02]"
          >
            Open Today demo
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* CARE LOOP */}
      <section className="border-t border-border/40 bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="text-center">
            <Pill>The Care Loop™</Pill>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl tracking-tight text-foreground sm:text-4xl">
              A planning system built for real life.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
            {careLoop.map(({ k, title, lead, bullets, icon: Icon, glow, ink }) => (
              <GlassCard key={k} className="relative overflow-hidden">
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${glow} blur-2xl`} aria-hidden />
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${ink}`} />
                  <span className="font-display text-[44px] leading-none text-foreground/80">{k}</span>
                </div>
                <div className="mt-4 font-display text-xl text-foreground">{title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                  {bullets.map(b => (
                    <li key={b} className="flex items-center gap-2">
                      <Check className={`h-3.5 w-3.5 ${ink}`} /> {b}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHETYPES */}
      <section id="archetypes" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
        <div className="max-w-2xl text-center sm:text-left mx-auto sm:mx-0">
          <Pill><Heart className="h-3 w-3" /> Who CareFlow is for</Pill>
          <h2 className="mt-4 font-display text-2xl tracking-tight text-foreground sm:text-4xl">
            Built for the people carrying the invisible load.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Find the archetype that matches your season. Each path comes with its own rhythm, atmosphere, and gentle support.
          </p>
        </div>
        <div className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mt-10 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {archetypes.map(a => (
            <GlassCard key={a.name} className="min-w-[260px] snap-start sm:min-w-[320px]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> {a.atmosphere}
              </div>
              <div className="mt-3 font-display text-xl text-foreground">{a.name}</div>
              <p className="mt-3 flex gap-2 text-sm italic text-foreground/80">
                <Quote className="h-3.5 w-3.5 shrink-0 text-secondary-foreground/60" />
                {a.quote}
              </p>
            </GlassCard>
          ))}
        </div>
        <div className="mt-6 flex justify-center sm:justify-start"><SecondaryCTA><Sparkles className="h-4 w-4" /> Find Your Archetype</SecondaryCTA></div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-border/40 bg-[hsl(36_55%_97%)]/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:items-end sm:text-left">
            <div className="max-w-xl">
              <Pill><Sparkles className="h-3 w-3" /> App features</Pill>
              <h2 className="mt-4 font-display text-2xl tracking-tight text-foreground sm:text-4xl">
                Everything you need. All in one beautiful space.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground sm:max-w-sm">
              Modular tools designed to flex with your real energy — from the foggy mornings to the slow Sundays.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="relative flex h-[180px] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border/50 p-4 text-center shadow-[0_8px_30px_-12px_hsl(258_30%_50%/0.18)] backdrop-blur-md sm:h-[240px] sm:gap-4 sm:rounded-3xl sm:p-6"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 0% 0%, hsl(145 40% 92% / 0.95) 0%, hsl(36 55% 97% / 0.85) 45%, hsl(350 55% 94% / 0.75) 100%)",
                  }}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(145_30%_28%)]/10 text-[hsl(145_30%_28%)] sm:h-16 sm:w-16 sm:rounded-2xl">
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                  </span>
                  <div>
                    <div className="font-display text-sm text-foreground sm:text-lg">{f.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ATMOSPHERES */}
      <section id="atmospheres" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
        <div className="text-center">
          <Pill><Moon className="h-3 w-3" /> Atmospheres</Pill>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl tracking-tight text-foreground sm:text-4xl">
            Choose the atmosphere that matches your energy.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Twelve immersive themes — each with its own palette, type, and emotional tone.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {atmospheres.map(a => {
            const Icon = a.icon;
            const selected = activeAtmos?.name === a.name;
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setActiveAtmos(selected ? null : a)}
                aria-pressed={selected}
                className={`group relative overflow-hidden rounded-2xl border p-3 text-left shadow-soft transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(36_50%_96%)] sm:rounded-3xl sm:p-4 ${
                  selected ? "border-white/80 ring-2 ring-white/70 scale-[1.02]" : "border-border/40"
                } ${a.dark ? "text-[hsl(36_50%_96%)]" : "text-[hsl(145_30%_18%)]"}`}
                style={{ background: a.bg, minHeight: 120 }}
              >
                <Icon className="h-5 w-5 opacity-80" />
                <div className="mt-8 sm:mt-12">
                  <div className="font-display text-xs sm:text-sm">{a.name}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-70 sm:text-[11px]">{a.tone}</div>
                </div>
              </button>
            );
          })}
        </div>
        {activeAtmos && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setActiveAtmos(null)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur transition-colors ${
                isDark
                  ? "border-white/30 bg-white/10 text-[hsl(36_50%_96%)] hover:bg-white/20"
                  : "border-border/60 bg-card/70 text-foreground hover:bg-card"
              }`}
            >
              Reset atmosphere
            </button>
          </div>
        )}
      </section>

      {/* STORY */}
      <section id="story" className="bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-5 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-3xl border border-border/40 shadow-cozy">
            <img src={storyImg} alt="Split scene: an overwhelmed mom surrounded by sticky notes and a calendar, beside the same mom looking calm and confident using CareFlow on a tablet" loading="lazy" width={1408} height={896} className="h-full w-full object-cover" />
          </div>
          <div className="text-center lg:text-left">
            <Pill><Heart className="h-3 w-3" /> Our story</Pill>
            <h2 className="mt-4 font-display text-2xl tracking-tight text-foreground sm:text-4xl">
              CareFlow was born from real caregiving.
            </h2>
            <p className="mt-4 text-foreground/85">
              CareFlow was created during late nights of caregiving, cleaning, planning, emotional labor, and trying to remember everything for everyone else while slowly losing space for yourself.
            </p>
            <p className="mt-3 text-foreground/85">
              This isn't just productivity. <em className="text-[hsl(28_70%_45%)] not-italic">It's support.</em>
            </p>
            <div className="mt-6 flex justify-center gap-3 lg:justify-start">
              <PrimaryCTA><CareFlowMark size={18} rounded="md" /> Start Your CareFlow</PrimaryCTA>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Pill>The invisible load</Pill>
          <h2 className="mt-4 font-display text-2xl tracking-tight text-foreground sm:text-4xl">
            You were never meant to carry all of this alone.
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-4">
          {stats.map(s => (
            <GlassCard key={s.label} className="text-center">
              <div className="font-display text-2xl text-foreground sm:text-4xl">{s.n}</div>
              <div className="mt-2 text-xs text-muted-foreground">{s.label}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* QUIZ (embedded) */}
      <section id="quiz" className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5 sm:pb-20">
        <div className="text-center">
          <Pill><Sparkles className="h-3 w-3" /> The Quiz</Pill>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl tracking-tight text-foreground sm:text-4xl">
            Find your caregiver archetype.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Two minutes. Zero pressure. Discover the planning rhythm that supports your real life.
          </p>
        </div>
        <div
          className="mt-8 overflow-hidden rounded-2xl border border-border/40 bg-[hsl(36_55%_97%)]/85 shadow-cozy backdrop-blur sm:mt-10 sm:rounded-[2rem]"
        >
          <CaregiverArchetypeQuiz embedded />
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(145_30%_28%)] px-5 py-3 text-center text-sm font-medium text-[hsl(36_50%_96%)] shadow-cozy transition-transform hover:scale-[1.02]"
          >
            <Heart className="h-4 w-4" /> Join the waitlist with your result
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/40 bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">Loved by caregivers like you</div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-5">
            {testimonials.map(t => (
              <GlassCard key={t.name} className="flex flex-col">
                <div className="text-amber-500/80">★★★★★</div>
                <p className="mt-3 text-sm text-foreground/85">"{t.quote}"</p>
                <div className="mt-4 text-xs">
                  <div className="font-medium text-foreground">— {t.name}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-5 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl p-6 text-[hsl(36_50%_96%)] shadow-cozy sm:rounded-[2.5rem] sm:p-14"
          style={{ background: "linear-gradient(120deg, hsl(150 28% 22%), hsl(150 32% 16%))" }}>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-2xl tracking-tight sm:text-4xl">
                Care for your day. Care for yourself.
              </h2>
              <p className="mt-3 max-w-md text-[hsl(36_45%_88%)]/85 mx-auto lg:mx-0">
                CareFlow helps you create structure that feels supportive instead of overwhelming.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 lg:justify-start">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(36_50%_96%)] px-6 py-3 text-sm font-medium text-[hsl(150_30%_18%)] transition-transform hover:scale-[1.02]"
                >
                  <CareFlowMark size={18} rounded="md" /> Start Your CareFlow
                </Link>
                <Link
                  to="/quiz"
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(36_45%_88%)]/30 px-6 py-3 text-sm font-medium text-[hsl(36_45%_88%)] hover:bg-[hsl(36_45%_88%)]/10"
                >
                  <Sparkles className="h-4 w-4" /> Find Your Archetype
                </Link>
              </div>
              <p className="mt-4 text-xs italic text-[hsl(36_45%_88%)]/70">Different paths. Same purpose.</p>
            </div>
            <ul className="space-y-3 text-sm text-[hsl(36_45%_88%)]/90">
              {["Plan with compassion","Reduce overwhelm","Support your energy","Care for your home","Make room for you"].map(l => (
                <li key={l} className="flex items-center gap-2"><Check className="h-4 w-4" /> {l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:gap-10 sm:px-5 sm:py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <CareFlowMark size={36} />
              <span className="leading-tight">
                <span className="font-display text-lg font-semibold">CareFlow</span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plan · Care · Grow</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm italic text-muted-foreground">
              You don't have to do it all. You just have to care for what matters today.
            </p>
          </div>
          {Object.entries(footerNav).map(([h, items]) => (
            <div key={h}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{h}</div>
              <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                {items.map(i => (
                  <li key={i.label}>
                    {i.href.startsWith("/") ? (
                      <Link to={i.href} className="hover:text-foreground">{i.label}</Link>
                    ) : (
                      <a href={i.href} className="hover:text-foreground">{i.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <div>© {new Date().getFullYear()} CareFlow — care for what matters today.</div>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-foreground">Privacy</a>
              <a href="/terms" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Accessibility</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}