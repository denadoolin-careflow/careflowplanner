import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf, Sparkles, Heart } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export default function Waitlist() {
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
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] shadow-sm">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="font-display text-lg font-semibold text-foreground">CareFlow</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">plan, care, grow</span>
          </span>
        </Link>
        <Link to="/auth" className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 hover:bg-card">
          Log in
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-16">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(145_22%_70%)]/50 bg-[hsl(145_35%_92%)]/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(145_30%_22%)] backdrop-blur">
            <Sparkles className="h-3 w-3" /> Early access
          </span>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Join the CareFlow waitlist.
          </h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Be among the first caregivers to step into CareFlow. Founding members get early access, special pricing, and a hand in shaping how the app cares for you.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground/80">
            {[
              "Early invite when we open the doors",
              "Founding-member pricing — locked in for life",
              "A say in features that matter most to you",
            ].map((l) => (
              <li key={l} className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-[hsl(28_70%_45%)]" /> {l}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-border/50 bg-card/85 p-6 shadow-cozy backdrop-blur-md sm:p-8">
          <WaitlistForm source="waitlist" />
        </div>
      </main>
    </div>
  );
}