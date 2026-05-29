import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf, Sparkles, Check } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

const tiers = [
  { name: "Free", tagline: "A gentle place to begin", perks: ["Daily planner", "Brain dump", "Soft reminders"] },
  { name: "Pro", tagline: "For your full caregiving life", perks: ["Everything in Free", "AI companion", "Mental load tools"], featured: true },
  { name: "Family", tagline: "Shared rhythms for your people", perks: ["Everything in Pro", "Shared spaces", "Care circles"] },
];

export default function Pricing() {
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    if (had) root.classList.remove("dark");
    return () => { if (had) root.classList.add("dark"); };
  }, []);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-foreground"
      style={{
        background:
          "radial-gradient(60% 50% at 80% 10%, hsl(350 65% 92% / 0.7), transparent 60%), radial-gradient(50% 40% at 10% 20%, hsl(145 40% 88% / 0.7), transparent 60%), linear-gradient(180deg, hsl(36 55% 96%) 0%, hsl(36 42% 95%) 100%)",
      }}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] shadow-sm">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold text-foreground">CareFlow</span>
        </Link>
        <Link to="/auth" className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 hover:bg-card">
          Log in
        </Link>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pt-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(145_22%_70%)]/50 bg-[hsl(145_35%_92%)]/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(145_30%_22%)] backdrop-blur">
          <Sparkles className="h-3 w-3" /> Coming soon
        </span>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">Pricing is on the way.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          We're polishing the plans with care. Join the waitlist to get early access and founding-member pricing — locked in for life.
        </p>
      </section>

      <section className="mx-auto mt-12 grid w-full max-w-6xl gap-5 px-5 sm:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative overflow-hidden rounded-3xl border p-6 backdrop-blur-md ${
              t.featured ? "border-[hsl(145_30%_28%)]/40 bg-card/90 shadow-cozy" : "border-border/40 bg-card/70"
            }`}
          >
            {t.featured && (
              <span className="absolute right-4 top-4 rounded-full bg-[hsl(145_30%_28%)] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[hsl(36_50%_96%)]">
                Most loved
              </span>
            )}
            <div className="font-display text-xl text-foreground">{t.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
            <div className="mt-6 font-display text-4xl tracking-tight text-foreground/40 blur-[2px] select-none">$ — / mo</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">Revealed at launch</div>
            <ul className="mt-6 space-y-2 text-sm text-foreground/80">
              {t.perks.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[hsl(145_30%_28%)]" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-16 w-full max-w-3xl px-5 pb-20">
        <div className="rounded-3xl border border-border/50 bg-card/85 p-6 shadow-cozy backdrop-blur-md sm:p-8">
          <div className="text-center">
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">Be first in line.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join the waitlist and we'll send your invite the moment CareFlow opens.
            </p>
          </div>
          <div className="mt-6">
            <WaitlistForm source="pricing" />
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <a href="mailto:hello@careflowplanner.app" className="hover:text-foreground">Contact</a>
          <span>© {new Date().getFullYear()} CareFlow Planner</span>
        </div>
      </footer>
    </div>
  );
}