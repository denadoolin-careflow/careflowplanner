import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sparkles, Leaf, Moon, Heart, Calendar, Brain, Utensils,
  Wallet, NotebookPen, Sun, Mountain, Flower2, Waves,
  Cloud, Sunrise, Trees, Coffee, ArrowRight, Check, Quote,
} from "lucide-react";
import botanical from "@/assets/landing-botanical.png";
import storyImg from "@/assets/landing-story.jpg";
import { CaregiverArchetypeQuiz } from "@/components/quiz/CaregiverArchetypeQuiz";

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
      className={`rounded-3xl border border-border/50 bg-card/70 p-6 shadow-[0_8px_30px_-12px_hsl(258_30%_50%/0.18)] backdrop-blur-md ${className}`}
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
        background: "var(--atmos-cta-bg, hsl(145 30% 28%))",
        color: "var(--atmos-cta-fg, hsl(36 50% 96%))",
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
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-6 py-3 text-sm font-medium text-foreground/90 backdrop-blur transition-colors hover:bg-card"
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
                <Leaf className="h-2.5 w-2.5 text-secondary-foreground/70" /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Section data ---------- */

const careLoop = [
  { k: "C", title: "Capture", lead: "Get it out of your head.", icon: Leaf,
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
  { icon: Leaf, title: "Home Reset", body: "Cleaning zones, routines, recurring resets." },
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
  { name: "Sage Sanctuary", tone: "Grounded",  icon: Leaf,    bg: "linear-gradient(135deg,hsl(145 32% 84%),hsl(36 45% 94%))", dark: false, accent: "145 30% 28%" },
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

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-700 ${isDark ? "text-[hsl(36_50%_96%)]" : "text-foreground"}`}
      style={{
        background: activeAtmos ? activeAtmos.bg : "hsl(36 42% 95%)",
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
                "radial-gradient(60% 50% at 80% 10%, hsl(350 65% 92% / 0.7), transparent 60%), radial-gradient(50% 40% at 10% 20%, hsl(145 40% 88% / 0.7), transparent 60%), linear-gradient(180deg, hsl(36 55% 96%) 0%, hsl(36 42% 95%) 100%)",
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] shadow-sm">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="leading-tight">
              <span className="font-display text-lg font-semibold text-foreground">CareFlow</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">plan, care, grow</span>
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
            <PrimaryCTA to="/waitlist"><Sparkles className="h-4 w-4" /> Join the Waitlist</PrimaryCTA>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24">
        <div className="relative">
          <Pill><Heart className="h-3 w-3" /> Built for real-life caregivers</Pill>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[58px]">
            Turn your daily workload into a{" "}
            <em className="not-italic text-[hsl(28_70%_45%)]">gentle loop</em>{" "}
            you can repeat.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            CareFlow is the emotionally intelligent planning system for caregivers, overwhelmed minds, neurodivergent users, and busy households — without pressure, guilt, or perfectionism.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <PrimaryCTA><Leaf className="h-4 w-4" /> Start Your CareFlow</PrimaryCTA>
            <SecondaryCTA><Sparkles className="h-4 w-4" /> Find Your Archetype</SecondaryCTA>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> All-in-one planner</span>
            <span className="inline-flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Mental load support</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI companion</span>
          </div>
          <p className="mt-5 text-xs italic text-muted-foreground/80">
            No pressure. No perfectionism. Just support.
          </p>
        </div>
        <div className="relative lg:pt-4">
          <HeroMockup />
        </div>
      </section>

      {/* CARE LOOP */}
      <section className="border-t border-border/40 bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="text-center">
            <Pill>The Care Loop™</Pill>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              A planning system built for real life.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
      <section id="archetypes" className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <Pill><Heart className="h-3 w-3" /> Who CareFlow is for</Pill>
          <h2 className="mt-4 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Built for the people carrying the invisible load.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Find the archetype that matches your season. Each path comes with its own rhythm, atmosphere, and gentle support.
          </p>
        </div>
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {archetypes.map(a => (
            <GlassCard key={a.name} className="min-w-[280px] snap-start sm:min-w-[320px]">
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
        <div className="mt-6"><SecondaryCTA><Sparkles className="h-4 w-4" /> Find Your Archetype</SecondaryCTA></div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-border/40 bg-[hsl(36_55%_97%)]/70">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <Pill><Leaf className="h-3 w-3" /> App features</Pill>
              <h2 className="mt-4 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
                Everything you need. All in one beautiful space.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground sm:max-w-sm">
              Modular tools designed to flex with your real energy — from the foggy mornings to the slow Sundays.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="relative flex h-[240px] flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border border-border/50 p-6 text-center shadow-[0_8px_30px_-12px_hsl(258_30%_50%/0.18)] backdrop-blur-md"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 0% 0%, hsl(145 40% 92% / 0.95) 0%, hsl(36 55% 97% / 0.85) 45%, hsl(350 55% 94% / 0.75) 100%)",
                  }}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(145_30%_28%)]/10 text-[hsl(145_30%_28%)]">
                    <Icon className="h-8 w-8" />
                  </span>
                  <div>
                    <div className="font-display text-lg text-foreground">{f.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ATMOSPHERES */}
      <section id="atmospheres" className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="text-center">
          <Pill><Moon className="h-3 w-3" /> Atmospheres</Pill>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Choose the atmosphere that matches your energy.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Twelve immersive themes — each with its own palette, type, and emotional tone.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {atmospheres.map(a => {
            const Icon = a.icon;
            const selected = activeAtmos?.name === a.name;
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setActiveAtmos(selected ? null : a)}
                aria-pressed={selected}
                className={`group relative overflow-hidden rounded-3xl border p-4 text-left shadow-soft transition-all hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(36_50%_96%)] ${
                  selected ? "border-white/80 ring-2 ring-white/70 scale-[1.02]" : "border-border/40"
                } ${a.dark ? "text-[hsl(36_50%_96%)]" : "text-[hsl(145_30%_18%)]"}`}
                style={{ background: a.bg, minHeight: 150 }}
              >
                <Icon className="h-5 w-5 opacity-80" />
                <div className="mt-12">
                  <div className="font-display text-sm">{a.name}</div>
                  <div className="text-[11px] uppercase tracking-widest opacity-70">{a.tone}</div>
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
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-3xl border border-border/40 shadow-cozy">
            <img src={storyImg} alt="A cozy candlelit reading nook with a journal and herbal tea" loading="lazy" width={1408} height={896} className="h-full w-full object-cover" />
          </div>
          <div>
            <Pill><Heart className="h-3 w-3" /> Our story</Pill>
            <h2 className="mt-4 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              CareFlow was born from real caregiving.
            </h2>
            <p className="mt-4 text-foreground/85">
              CareFlow was created during late nights of caregiving, cleaning, planning, emotional labor, and trying to remember everything for everyone else while slowly losing space for yourself.
            </p>
            <p className="mt-3 text-foreground/85">
              This isn't just productivity. <em className="text-[hsl(28_70%_45%)] not-italic">It's support.</em>
            </p>
            <div className="mt-6 flex gap-3">
              <PrimaryCTA><Leaf className="h-4 w-4" /> Start Your CareFlow</PrimaryCTA>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Pill>The invisible load</Pill>
          <h2 className="mt-4 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            You were never meant to carry all of this alone.
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(s => (
            <GlassCard key={s.label} className="text-center">
              <div className="font-display text-3xl text-foreground sm:text-4xl">{s.n}</div>
              <div className="mt-2 text-xs text-muted-foreground">{s.label}</div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* QUIZ (embedded) */}
      <section id="quiz" className="mx-auto w-full max-w-5xl px-5 pb-20">
        <div className="text-center">
          <Pill><Sparkles className="h-3 w-3" /> The Quiz</Pill>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Find your caregiver archetype.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Two minutes. Zero pressure. Discover the planning rhythm that supports your real life.
          </p>
        </div>
        <div
          className="mt-10 overflow-hidden rounded-[2rem] border border-border/40 bg-[hsl(36_55%_97%)]/85 shadow-cozy backdrop-blur"
        >
          <CaregiverArchetypeQuiz embedded />
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            to="/waitlist"
            className="inline-flex items-center gap-2 rounded-full bg-[hsl(145_30%_28%)] px-6 py-3 text-sm font-medium text-[hsl(36_50%_96%)] shadow-cozy transition-transform hover:scale-[1.02]"
          >
            <Heart className="h-4 w-4" /> Join the waitlist with your result
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/40 bg-[hsl(36_50%_97%)]/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">Loved by caregivers like you</div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="relative overflow-hidden rounded-[2.5rem] p-10 text-[hsl(36_50%_96%)] shadow-cozy sm:p-14"
          style={{ background: "linear-gradient(120deg, hsl(150 28% 22%), hsl(150 32% 16%))" }}>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                Care for your day. Care for yourself.
              </h2>
              <p className="mt-3 max-w-md text-[hsl(36_45%_88%)]/85">
                CareFlow helps you create structure that feels supportive instead of overwhelming.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(36_50%_96%)] px-6 py-3 text-sm font-medium text-[hsl(150_30%_18%)] transition-transform hover:scale-[1.02]"
                >
                  <Leaf className="h-4 w-4" /> Start Your CareFlow
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
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)]">
                <Leaf className="h-4 w-4" />
              </span>
              <span className="leading-tight">
                <span className="font-display text-lg font-semibold">CareFlow</span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">plan, care, grow</span>
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
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
              <a href="#" className="hover:text-foreground">Accessibility</a>
              <a href="#" className="hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}