import { Link } from "react-router-dom";
import { ArrowRight, Heart, Moon, Sparkles, Star, Quote, ChevronRight } from "lucide-react";
import heroPhone from "@/assets/landing-hero-phone.jpg";
import { CareFlowMark } from "@/components/widgets/CareFlowMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { landingColorStyle } from "@/lib/landing-colors";
import { LandingContentProvider, useLandingContent } from "@/lib/landing-content";
import { useEffect, useState } from "react";
import { ClubSignup } from "@/components/corner/ClubSignup";
import { PostCard } from "@/pages/Corner";
import { ProductCard } from "@/pages/Shop";
import { listPublishedPosts, listVisibleProducts, type BlogPost, type Product } from "@/lib/corner";
import {
  E, EditableSection, EditableTestimonialField, TestimonialControls,
  AddTestimonialButton, LandingEditBar,
} from "@/components/landing/LandingEditable";

/* ---------------- Phase helpers (rhythm tokens: theme + dark-mode aware) ---------------- */

type PhaseKey = "plan" | "grow" | "care" | "letgo";
const ph = (k: PhaseKey, v: "" | "-tint" | "-deep" = "") => `hsl(var(--rhythm-${k}${v}))`;
const PHASE_GRADIENT = `linear-gradient(90deg, ${ph("plan")}, ${ph("grow")}, ${ph("care")}, ${ph("letgo")})`;
const PHASES: { key: PhaseKey; emoji: string; moon: string }[] = [
  { key: "plan", emoji: "🌱", moon: "🌑" },
  { key: "grow", emoji: "☀️", moon: "🌓" },
  { key: "care", emoji: "🧡", moon: "🌕" },
  { key: "letgo", emoji: "🌙", moon: "🌗" },
];
const FEATURE_PHASES: PhaseKey[] = ["grow", "plan", "plan", "care", "letgo", "letgo"];
const FEATURE_EMOJIS = ["🌤", "🗓", "🌿", "🏡", "📓", "🌙"];

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
          Plan ✦ Grow ✦ Care ✦ Let go
        </span>
      </span>
    </span>
  );
}

/* ---------------- CTAs ---------------- */

const SEASONAL_CTA =
  "rounded-full bg-gradient-seasonal bg-[length:200%_200%] bg-[position:0%_50%] px-6 text-white shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition-all duration-300 hover:scale-[1.02] hover:brightness-110 hover:bg-[position:100%_50%] focus-visible:ring-2 focus-visible:ring-primary/40";

function WaitlistButton({ k, className }: { k: string; className?: string }) {
  return (
    <Button asChild size="lg" className={cn(SEASONAL_CTA, className)}>
      <Link to="/waitlist"><E k={k} /></Link>
    </Button>
  );
}

function GhostButton({ k, href = "#phases" }: { k: string; href?: string }) {
  return (
    <Button asChild size="lg" variant="outline" className="rounded-full border-border/70 bg-card/70 px-6 text-foreground hover:bg-card">
      <a href={href}><E k={k} /></a>
    </Button>
  );
}

/* ---------------- Nav ---------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoLockup size={40} />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] font-semibold text-foreground/75 lg:flex">
          <a href="#phases" className="transition-colors hover:text-primary">The Four Phases</a>
          <a href="#features" className="transition-colors hover:text-primary">Features</a>
          <a href="#community" className="transition-colors hover:text-primary">Community</a>
          <Link to="/corner" className="transition-colors hover:text-primary">Corner</Link>
          <Link to="/shop" className="transition-colors hover:text-primary">Shop</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-[15px] font-semibold text-foreground/80 hover:text-primary sm:inline">
            Sign in
          </Link>
          <WaitlistButton k="nav.cta" className="px-5" />
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero (design A: headline + phone preview) ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55% 40% at 12% 15%, hsl(var(--rhythm-grow-tint) / 0.5), transparent 60%), radial-gradient(45% 40% at 88% 60%, hsl(var(--rhythm-plan-tint) / 0.5), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:pb-28 lg:pt-20">
        <div className="animate-fade-in">
          <span className="inline-flex items-center rounded-full bg-accent/40 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.25em] text-primary">
            <E k="hero.eyebrow" />
          </span>
          <h1 className="mt-6 font-display text-[44px] font-normal leading-[1.05] text-foreground sm:text-6xl lg:text-[68px]">
            <E k="hero.title" />
          </h1>
          <p className="mt-5 text-xl font-semibold text-foreground">
            <E k="hero.sub" />
          </p>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            <E k="hero.body" />
          </p>
          <p className="mt-3 max-w-xl text-muted-foreground">
            <E k="hero.body2" />
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <WaitlistButton k="hero.primary" />
            <GhostButton k="hero.secondary" />
          </div>
          <p className="mt-6 font-display italic text-muted-foreground">
            <E k="hero.note" />
          </p>
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
                <E k="hero.social" /> <E k="hero.socialSub" className="opacity-70" />
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
          {/* Phase badge */}
          <div
            className="absolute -top-4 right-4 hidden h-32 w-32 flex-col items-center justify-center rounded-full p-4 text-center shadow-xl sm:flex md:right-8 md:h-36 md:w-36"
            style={{ background: ph("plan"), color: ph("plan", "-deep") }}
          >
            <Moon className="mb-1 h-4 w-4" />
            <p className="text-[11px] font-semibold leading-tight"><E k="hero.badge1" /></p>
            <p className="text-[11px] leading-tight opacity-90"><E k="hero.badge2" /></p>
          </div>
          {/* Moon card */}
          <div className="absolute -bottom-4 -left-2 hidden max-w-[220px] rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[var(--shadow-cozy)] backdrop-blur sm:block md:-left-6 md:bottom-8">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full" style={{ background: ph("letgo", "-tint"), color: ph("letgo", "-deep") }}>
                <Moon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-foreground"><E k="hero.moonTitle" /></p>
            </div>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              <E k="hero.moonBody" />
            </p>
            <a href="#phases" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
              <E k="hero.moonLink" /> <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
      {/* Phase ribbon divider */}
      <div className="h-3 w-full" style={{ background: PHASE_GRADIENT }} aria-hidden />
    </section>
  );
}

/* ---------------- Problem (design B tone) ---------------- */

function Problem() {
  return (
    <section className="px-6 py-20" style={{ background: ph("plan", "-tint") }}>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-4xl leading-tight" style={{ color: ph("plan", "-deep") }}>
          <E k="problem.title" />
        </h2>
        <p className="mt-4 text-lg text-foreground/85"><E k="problem.body1" /></p>
        <p className="mt-4 text-lg text-foreground/85"><E k="problem.body2" /></p>
        <p className="mt-4 text-lg text-foreground/85"><E k="problem.body3" /></p>
        <p className="mt-6 text-lg font-bold text-foreground"><E k="problem.turn" /></p>
        <p className="mt-3 font-display text-2xl italic leading-snug" style={{ color: ph("plan", "-deep") }}>
          <E k="problem.question" />
        </p>
      </div>
    </section>
  );
}

/* ---------------- Four phases (design B: scrolling phase panels) ---------------- */

function Phases() {
  return (
    <div id="phases">
      <div className="bg-background px-6 py-16 text-center">
        <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight text-foreground">
          <E k="way.title" />
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          <E k="way.body" />
        </p>
      </div>
      {PHASES.map((p, i) => (
        <section key={p.key} className="px-6 py-20 transition-colors" style={{ background: ph(p.key, "-tint") }}>
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row">
            <div
              className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full text-6xl shadow-inner"
              style={{ background: ph(p.key) }}
              aria-hidden
            >
              {p.moon}
            </div>
            <div className="text-center md:text-left">
              <div className="text-sm font-bold uppercase tracking-[0.3em]" style={{ color: ph(p.key, "-deep") }}>
                {p.emoji} <E k={`phases.${i}.name`} />
              </div>
              <h3 className="mt-2 font-display text-4xl text-foreground">
                <E k={`phases.${i}.lead`} />
              </h3>
              <p className="mt-3 text-lg text-foreground/85">
                <E k={`phases.${i}.body`} />
              </p>
              <p className="mt-3 font-display italic" style={{ color: ph(p.key, "-deep") }}>
                <E k={`phases.${i}.note`} />
              </p>
            </div>
          </div>
        </section>
      ))}
      <p className="bg-background px-6 py-10 text-center font-display text-2xl text-foreground">
        <E k="way.close" />
      </p>
    </div>
  );
}

/* ---------------- Features (design A: 6 connected features) ---------------- */

function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h2 className="font-display text-4xl leading-tight text-foreground"><E k="features.title" /></h2>
        <p className="mt-3 text-muted-foreground"><E k="features.sub" /></p>
      </div>
      <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_EMOJIS.map((emoji, i) => (
          <div key={i} className="border-t-2 pt-4" style={{ borderColor: ph(FEATURE_PHASES[i]) }}>
            <h3 className="font-display text-xl text-foreground">{emoji} <E k={`features.${i}.title`} /></h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground"><E k={`features.${i}.body`} /></p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Difference (design B) ---------------- */

function Difference() {
  return (
    <section className="px-6 py-20" style={{ background: ph("grow", "-tint") }}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl leading-tight" style={{ color: ph("grow", "-deep") }}>
          <E k="difference.title" />
        </h2>
        <p className="mt-4 text-lg text-foreground/85"><E k="difference.body1" /></p>
        <p className="mt-4 text-lg text-foreground/85"><E k="difference.body2" /></p>
        <p className="mt-4 text-lg text-foreground/85"><E k="difference.body3" /></p>
        <p className="mt-4 text-lg text-foreground/85"><E k="difference.body4" /></p>
        <p className="mt-6 font-display text-2xl italic" style={{ color: ph("grow", "-deep") }}>
          <E k="difference.close" />
        </p>
      </div>
    </section>
  );
}

/* ---------------- Who it's for (design B) ---------------- */

function Who() {
  return (
    <section className="px-6 py-20" style={{ background: ph("care", "-tint") }}>
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-4xl leading-tight" style={{ color: ph("care", "-deep") }}>
          <E k="who.title" />
        </h2>
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <p key={n} className="border-l-4 pl-4 text-lg text-foreground/85" style={{ borderColor: ph("care") }}>
              <E k={`who.item${n}`} />
            </p>
          ))}
        </div>
        <p className="mt-8 text-lg font-bold text-foreground"><E k="who.close" /></p>
      </div>
    </section>
  );
}

/* ---------------- Philosophy (design B: four phase lines) ---------------- */

function Philosophy() {
  return (
    <div>
      {PHASES.map((p, i) => (
        <div
          key={p.key}
          className="px-6 py-14 text-center"
          style={{ background: `radial-gradient(ellipse at center, ${ph(p.key)} 0%, ${ph(p.key, "-tint")} 70%)` }}
        >
          <h2 className="font-display text-4xl text-foreground md:text-5xl">
            <E k={`philosophy.line${i + 1}`} />
          </h2>
        </div>
      ))}
      <div className="px-6 py-16" style={{ background: ph("letgo", "-tint") }}>
        <div className="mx-auto max-w-2xl space-y-2 text-center text-lg text-foreground/85">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <p key={n}><E k={`philosophy.body${n}`} /></p>
          ))}
          <p className="pt-4 font-bold text-foreground"><E k="philosophy.close" /></p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Community / testimonials ---------------- */

function CornerSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  useEffect(() => { listPublishedPosts(3).then(setPosts); }, []);
  return (
    <section id="corner" className="bg-background px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-[0.3em] text-primary"><E k="corner.eyebrow" /></div>
          <h2 className="mx-auto mt-3 max-w-3xl font-display text-4xl leading-tight text-foreground"><E k="corner.title" /></h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground"><E k="corner.body" /></p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground">New posts are coming soon.</p>}
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
        <div className="mt-8 text-center"><Button asChild variant="outline" className="min-h-11"><Link to="/corner">Visit the Corner <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
      </div>
    </section>
  );
}

function ClubSection() {
  const { t } = useLandingContent();
  return (
    <section id="club" className="px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-secondary/60 p-8 text-center">
        <div className="text-sm font-bold uppercase tracking-[0.3em] text-primary"><E k="club.eyebrow" /></div>
        <h2 className="mt-3 font-display text-4xl text-foreground"><E k="club.title" /></h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground"><E k="club.body" /></p>
        <ClubSignup source="landing" cta={t("club.cta")} thanks={t("club.thanks")} className="mx-auto mt-6 max-w-xl" />
      </div>
    </section>
  );
}

function ShopSection() {
  const [items, setItems] = useState<Product[]>([]);
  useEffect(() => { listVisibleProducts().then((r) => setItems(r.slice(0, 4))); }, []);
  return (
    <section id="shop" className="bg-background px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-[0.3em] text-primary"><E k="shop.eyebrow" /></div>
          <h2 className="mx-auto mt-3 max-w-3xl font-display text-4xl text-foreground"><E k="shop.title" /></h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground"><E k="shop.body" /></p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground">Products are coming soon.</p>}
          {items.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        <div className="mt-8 text-center"><Button asChild variant="outline" className="min-h-11"><Link to="/shop">Visit the shop <ArrowRight className="ml-1 h-4 w-4" /></Link></Button></div>
      </div>
    </section>
  );
}

function Community() {
  const { doc } = useLandingContent();
  return (
    <section id="community" className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            <E k="community.eyebrow" />
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
            <E k="community.title" />
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            <E k="community.body" />
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {doc.testimonials.map((t, i) => (
            <div key={i} className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
              <TestimonialControls index={i} />
              <Quote className="h-6 w-6 text-primary/50" />
              <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/85"><EditableTestimonialField index={i} field="quote" /></p>
              <div className="mt-4 flex items-center gap-2">
                {t.avatar ? <img src={t.avatar} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" /> : <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{t.name.slice(0, 1)}</span>}
                <span className="text-[13px] font-semibold text-foreground">— <EditableTestimonialField index={i} field="name" /></span>
              </div>
            </div>
          ))}
          <AddTestimonialButton />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA (design A: phase-tint panel) ---------------- */

function FinalCTA() {
  return (
    <section className="px-6 pb-20">
      <div
        className="mx-auto max-w-4xl rounded-[2.5rem] p-10 text-center md:p-16"
        style={{ background: `linear-gradient(135deg, ${ph("plan", "-tint")}, ${ph("grow", "-tint")}, ${ph("care", "-tint")}, ${ph("letgo", "-tint")})` }}
      >
        <div className="text-5xl" aria-hidden>🌘</div>
        <h2 className="mt-4 font-display text-4xl leading-tight text-foreground">
          <E k="final.title" />
        </h2>
        <p className="mt-4 text-lg font-semibold text-foreground"><E k="final.sub" /></p>
        <p className="mt-2 text-muted-foreground"><E k="final.body" /></p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <WaitlistButton k="final.primary" />
          <GhostButton k="final.secondary" />
        </div>
        <p className="mt-6 font-display italic text-foreground/80"><E k="final.note" /></p>
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
        <p className="text-sm text-muted-foreground"><E k="footer.line" /></p>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link to="/corner" className="hover:text-primary">CareFlow Corner</Link>
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          <Link to="/pricing" className="hover:text-primary">Pricing</Link>
          <Link to="/privacy" className="hover:text-primary">Privacy</Link>
          <Link to="/terms" className="hover:text-primary">Terms</Link>
          <span className="text-xs">© {new Date().getFullYear()} CareFlow</span>
        </div>
      </div>
    </footer>
  );
}

function Themed({ children }: { children: import("react").ReactNode }) {
  const { doc } = useLandingContent();
  return <div className="min-h-screen bg-background text-foreground" style={landingColorStyle(doc.colors)}>{children}</div>;
}

export default function Landing() {
  const edit = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1";
  return (
    <LandingContentProvider initialEditing={edit}>
      <Themed>
        <Nav />
        <main>
          <EditableSection id="hero"><Hero /></EditableSection>
          <EditableSection id="problem"><Problem /></EditableSection>
          <EditableSection id="phases"><Phases /></EditableSection>
          <EditableSection id="features"><Features /></EditableSection>
          <EditableSection id="difference"><Difference /></EditableSection>
          <EditableSection id="who"><Who /></EditableSection>
          <EditableSection id="philosophy"><Philosophy /></EditableSection>
          <EditableSection id="community"><Community /></EditableSection>
          <EditableSection id="corner"><CornerSection /></EditableSection>
          <EditableSection id="club"><ClubSection /></EditableSection>
          <EditableSection id="shop"><ShopSection /></EditableSection>
          <EditableSection id="finalCta"><FinalCTA /></EditableSection>
        </main>
        <Footer />
        <LandingEditBar />
      </Themed>
    </LandingContentProvider>
  );
}
