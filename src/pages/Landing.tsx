import { Link } from "react-router-dom";
import {
  ArrowRight, Calendar, Heart, Leaf, Moon, DollarSign, Apple,
  Play, Sparkles, Star, Quote, Check, ChevronRight,
} from "lucide-react";
import heroPhone from "@/assets/landing-hero-phone.jpg";
import { CareFlowMark } from "@/components/widgets/CareFlowMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- Brand lockup ---------------- */

function LogoLockup({ size = 40, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <CareFlowMark size={size} rounded="xl" decorative={false} />
      <span className="min-w-0 leading-tight">
        <span className="block font-brand text-[17px] font-extrabold tracking-tight text-gradient-seasonal">
          CareFlow
        </span>
        {!compact && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
            <span className="h-px w-3 bg-border" />
            Planner
            <span className="h-px w-3 bg-border" />
          </span>
        )}
        <span className="block text-[9.5px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Plan · Care · Grow
        </span>
      </span>
    </span>
  );
}

/* ---------------- Primary CTA (seasonal gradient) ---------------- */

const SEASONAL_CTA =
  "rounded-full bg-gradient-seasonal bg-[length:200%_200%] bg-[position:0%_50%] px-6 text-white shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition-all duration-300 hover:scale-[1.02] hover:brightness-110 hover:bg-[position:100%_50%] focus-visible:ring-2 focus-visible:ring-primary/40";

/* ---------------- Nav ---------------- */

function Nav() {
  const links = ["Home", "Features", "The Method", "Quiz", "Pricing", "About", "Blog"];
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoLockup size={40} />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-semibold text-foreground/75 lg:flex">
          {links.map((l) => (
            <a
              key={l}
              href={l === "Quiz" ? "#quiz" : l === "Pricing" ? "/pricing" : l === "Features" ? "#features" : l === "The Method" ? "#method" : "#"}
              className={cn("hover:text-primary transition-colors", l === "Home" && "text-primary underline decoration-2 underline-offset-8")}
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-[15px] font-semibold text-foreground/80 hover:text-primary sm:inline">
            Sign in
          </Link>
          <Button asChild size="lg" className={SEASONAL_CTA}>
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 40% at 12% 15%, hsl(var(--season-summer) / 0.14), transparent 60%), radial-gradient(45% 40% at 88% 60%, hsl(var(--season-lavender, 260 55% 70%) / 0.12), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:pb-28 lg:pt-20">
        <div className="animate-fade-in">
          <span className="inline-flex items-center rounded-full bg-accent/40 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.25em] text-primary">
            Plan · Care · Grow
          </span>
          <h1 className="mt-6 font-display text-[44px] font-normal leading-[1.05] text-foreground sm:text-6xl lg:text-[68px]">
            The all-in-one planner for the{" "}
            <span className="italic font-display text-gradient-seasonal">beautiful chaos</span>{" "}
            of family life.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            CareFlow Planner helps you simplify your days, care for what matters most, and make space for yourself — mentally, physically, and emotionally.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/90">
              <a href="#"><Apple className="mr-2 h-5 w-5 fill-current" /> Download for iOS</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-border/70 bg-card px-6 text-foreground hover:bg-secondary">
              <a href="#"><Play className="mr-2 h-5 w-5 fill-current" /> Download for Android</a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full border border-primary/25 bg-primary/5 px-6 text-primary hover:bg-primary/10">
              <Link to="/quiz"><Sparkles className="mr-2 h-4 w-4" /> Take the Quiz</Link>
            </Button>
          </div>
          <div className="mt-7 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80",
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&q=80",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80",
                "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&q=80",
              ].map((src, i) => (
                <img key={i} src={src} alt="" loading="lazy" className="h-10 w-10 rounded-full border-2 border-background object-cover" />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Loved by 10,000+ caregivers <span className="opacity-70">and growing every day.</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <img
            src={heroPhone}
            alt="CareFlow Planner shown on an iPhone in a warm botanical scene"
            width={1200}
            height={1408}
            className="w-full rounded-[36px] object-cover shadow-[0_30px_60px_-20px_rgba(60,40,20,0.25)]"
          />
          {/* Green circular badge */}
          <div className="absolute -top-4 right-4 hidden h-32 w-32 flex-col items-center justify-center rounded-full bg-primary p-4 text-center text-primary-foreground shadow-xl sm:flex md:right-8 md:h-36 md:w-36">
            <Heart className="mb-1 h-4 w-4" />
            <p className="text-[11px] font-semibold leading-tight">Designed for caregivers.</p>
            <p className="text-[11px] leading-tight opacity-90">Built for real life.</p>
          </div>
          {/* Moon card */}
          <div className="absolute -bottom-4 -left-2 hidden max-w-[220px] rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[var(--shadow-cozy)] backdrop-blur sm:block md:-left-6 md:bottom-8">
            <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-moon-soft text-moon-foreground">
                <Moon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-foreground">Moon in Taurus<br />Today</p>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              A beautiful day for slowing down, grounding, and enjoying the little comforts.
            </p>
            <a href="#" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              View Moon Guide <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Feature strip ---------------- */

const FEATURES = [
  { icon: Calendar, title: "Plan Your Days", body: "Organize tasks, routines, appointments and family schedules." },
  { icon: Heart, title: "Care for What Matters", body: "Track health, medications, therapies, and important care needs." },
  { icon: Leaf, title: "Nourish Your Family", body: "Plan meals, manage groceries, recipes and pantry inventory." },
  { icon: Moon, title: "Align with Nature", body: "Lunar guidance, astrology insights and cycle awareness." },
  { icon: DollarSign, title: "Manage Your Money", body: "Budget, track expenses and plan for your family's future." },
];

function FeatureStrip() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 pb-16">
      <div className="rounded-[32px] border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)] sm:p-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-center">
              <div
                className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gradient-seasonal p-[2px] shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.4)]"
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-card text-primary">
                  <f.icon className="h-6 w-6" strokeWidth={2.25} />
                </div>
              </div>
              <h3 className="font-display text-lg text-foreground">{f.title}</h3>
              <p className="mx-auto mt-2 max-w-[200px] text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Quiz band ---------------- */

const ARCHETYPES_MINI = [
  { icon: "🌳", label: "Caregivers", body: "You care for everyone — don't forget yourself." },
  { icon: "🧠", label: "Neurodivergent Minds", body: "Your brain works differently — and that's okay." },
  { icon: "🌙", label: "Rhythm Planners", body: "You plan with your energy, not just time." },
  { icon: "🌅", label: "Rebuilders", body: "You're building a better tomorrow, one step at a time." },
  { icon: "🏡", label: "Home & Family", body: "Home is how you care for the people you love." },
];

function QuizBand() {
  return (
    <section id="quiz" className="mx-auto max-w-7xl px-6 pb-20">
      <div
        className="relative overflow-hidden rounded-[32px] border border-border/60 p-6 shadow-[var(--shadow-soft)] sm:p-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--accent-soft)), hsl(var(--warm-soft)) 60%, hsl(var(--primary-soft)))",
        }}
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          {/* Left: quiz card */}
          <div className="relative rounded-3xl bg-card p-7 shadow-[var(--shadow-cozy)]">
            <div className="absolute -top-5 left-1/2 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-accent-soft text-accent shadow-md">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Caregiver Archetype Quiz
            </p>
            <h3 className="mt-3 text-center font-display text-2xl leading-tight text-foreground">
              Which kind of caregiver are you?
            </h3>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              A 90-second quiz to shape your planner around the way you actually give.
            </p>
            <Button asChild className={cn("mt-5 w-full", SEASONAL_CTA)}>
              <Link to="/quiz">Take the Quiz <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          {/* Middle: copy + archetype tiles */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Discover Your Caregiver Archetype
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-foreground sm:text-4xl">
              Understand your natural care style.
            </h2>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Our quick quiz reveals your Caregiver Archetype and creates a personalized planning rhythm that honors your energy, values, and real life.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {ARCHETYPES_MINI.map((a) => (
                <div key={a.label} className="text-center">
                  <div className="mx-auto mb-2 text-3xl">{a.icon}</div>
                  <p className="font-brand text-[13px] font-bold text-foreground">{a.label}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{a.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: sample quiz question */}
          <div className="rotate-[3deg] rounded-3xl bg-card p-6 shadow-[var(--shadow-cozy)]">
            <p className="text-[11px] font-semibold text-muted-foreground">Question 03 of 12</p>
            <h4 className="mt-2 font-display text-xl leading-snug text-foreground">
              What energizes you most in your day?
            </h4>
            <div className="mt-4 space-y-2">
              {[
                { i: Heart, t: "Helping others", tint: "text-accent" },
                { i: Check, t: "Checking things off your list", tint: "text-primary" },
                { i: Leaf, t: "Creating calm & connection", tint: "text-[hsl(var(--season-forest))] dark:text-[hsl(var(--season-spring))]" },
                { i: Sparkles, t: "Planning for what's next", tint: "text-[hsl(var(--season-summer))]" },
              ].map((o) => (
                <div key={o.t} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
                  <o.i className={cn("h-4 w-4", o.tint)} />
                  <span className="text-[13px] text-foreground">{o.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Archetype grid ---------------- */

// Tints reference semantic season/atmosphere tokens so they recolor in dark mode.
const seasonTint = (v: string) => `bg-[hsl(var(--season-${v})/0.14)] dark:bg-[hsl(var(--season-${v})/0.22)]`;
const ARCHETYPES: { icon: string; title: string; quote: string; tint: string }[] = [
  { icon: "🌿", title: "The Mental Load Carrier",       quote: "If I don't remember it, nobody will.",             tint: seasonTint("spring") },
  { icon: "🔥", title: "The Burnt-Out Caregiver",       quote: "I'm functioning… but barely.",                     tint: seasonTint("autumn") },
  { icon: "🧠", title: "The Neurodivergent Navigator",  quote: "My brain needs flexibility, not pressure.",        tint: seasonTint("indigo") },
  { icon: "🏡", title: "The Gentle Homemaker",          quote: "Home is how I care for people.",                   tint: seasonTint("forest") },
  { icon: "🌙", title: "The Moon-Guided Planner",       quote: "I plan with energy, not just time.",               tint: seasonTint("purple") },
  { icon: "🌅", title: "The Rebuilding Dreamer",        quote: "I care for everyone… but I still have dreams too.", tint: seasonTint("summer") },
  { icon: "🤝", title: "The Quiet Provider",            quote: "I carry the weight quietly.",                      tint: seasonTint("winter") },
  { icon: "🌊", title: "The Reset Seeker",              quote: "I'm ready for a fresh start.",                     tint: seasonTint("teal") },
  { icon: "🛡️", title: "The Burnt-Out Protector",       quote: "I'm exhausted, but I still show up.",              tint: seasonTint("autumn") },
  { icon: "👨‍👧", title: "The Rebuilding Father",         quote: "I'm trying to become someone healthier.",           tint: seasonTint("indigo") },
  { icon: "🧩", title: "The Neurodivergent Dad",        quote: "My brain works differently.",                      tint: seasonTint("spring") },
];

function ArchetypeGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="mb-8 text-center">
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          <Sparkles className="mr-2 inline h-6 w-6 text-[hsl(var(--season-summer))]" />
          Which kind of caregiver are you?
          <Sparkles className="ml-2 inline h-6 w-6 text-[hsl(var(--season-summer))]" />
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          A 90-second quiz to shape your planner around the way you actually give.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {ARCHETYPES.map((a) => (
          <div key={a.title} className={cn("rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-soft)]", a.tint)}>
            <p className="font-brand text-[14px] font-bold text-foreground">
              <span className="mr-1">{a.icon}</span> {a.title}
            </p>
            <p className="mt-2 text-[12px] italic leading-snug text-muted-foreground">"{a.quote}"</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Community band ---------------- */

const TESTIMONIALS = [
  { quote: "CareFlow has helped me go from overwhelmed to organized. I finally feel like I have a system that works for my family.", name: "Sarah M.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&q=80" },
  { quote: "The lunar guidance and journal prompts are my favorite part. It keeps me grounded and reminds me to care for myself too.", name: "Melissa T.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&q=80" },
  { quote: "I love having everything in one place — appointments, meals, meds, tasks, and even budgeting. It's beautiful and functional!", name: "Jasmine R.", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&q=80" },
];

function Community() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            Join a community that gets it
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
            You're not alone in this.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            CareFlow is more than an app — it's a community of caregivers supporting caregivers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
              <Quote className="h-6 w-6 text-primary/50" />
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/85">{t.quote}</p>
              <div className="mt-4 flex items-center gap-2">
                <img src={t.avatar} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                <span className="text-[13px] font-semibold text-foreground">— {t.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-seasonal opacity-95" />
      {/* Contrast scrim to guarantee AA on white text over the bright summer stop */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.28))]" />
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="text-white">
          <Sparkles className="mb-3 h-5 w-5 opacity-90" />
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">
            Your calm. Your rhythm.<br />Your flow.
          </h2>
          <p className="mt-3 max-w-md text-[15px] text-white/90">
            Start your journey with CareFlow Planner today.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2">
            <a href="#" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background shadow-md">
              <Apple className="h-5 w-5 fill-current" />
              <span className="leading-tight">
                <span className="block text-[9px] uppercase tracking-widest opacity-80">Download on the</span>
                <span className="block text-sm font-semibold">App Store</span>
              </span>
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background shadow-md">
              <Play className="h-5 w-5 fill-current" />
              <span className="leading-tight">
                <span className="block text-[9px] uppercase tracking-widest opacity-80">Get it on</span>
                <span className="block text-sm font-semibold">Google Play</span>
              </span>
            </a>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-xl bg-white p-2 shadow-md">
            <div className="h-full w-full bg-[linear-gradient(45deg,transparent_25%,#000_25%_50%,transparent_50%_75%,#000_75%),linear-gradient(-45deg,transparent_25%,#000_25%_50%,transparent_50%_75%,#000_75%)] bg-[length:8px_8px] opacity-90" />
          </div>
          <div className="text-white">
            <p className="font-display text-lg leading-snug">Plan with intention.<br />Care with love.<br />Grow together.</p>
            <Heart className="mt-1 h-4 w-4 fill-current opacity-80" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 sm:flex-row">
        <LogoLockup size={34} />
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
        <FeatureStrip />
        <QuizBand />
        <ArchetypeGrid />
        <Community />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
