import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf, Sparkles, Check, Heart } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

type Cadence = "monthly" | "yearly";

const PLANS = {
  free: {
    name: "Free",
    tagline: "A gentle place to begin",
    monthly: 0,
    yearly: 0,
    perks: ["Daily planner & brain dump", "3 habits, 1 routine", "5 journal entries / week", "10 AI suggestions / month"],
  },
  pro: {
    name: "Pro",
    tagline: "Your full caregiving life",
    monthly: 8.99,
    yearly: 59.99,
    monthlyPriceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    perks: [
      "Unlimited habits & routines",
      "AI companion & voice capture",
      "Mental load tools + cycle planning",
      "300 AI actions / month",
      "Home & meal AI",
    ],
    featured: true,
  },
  family: {
    name: "Family",
    tagline: "Shared rhythms for up to 4",
    monthly: 14.99,
    yearly: 99.99,
    monthlyPriceId: "family_monthly",
    yearlyPriceId: "family_yearly",
    perks: [
      "Everything in Pro",
      "Up to 4 seats",
      "Shared care circles & calendars",
      "800 AI actions / month (pooled)",
    ],
  },
} as const;

export default function Pricing() {
  const { user } = useStore();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const sub = useSubscription(user?.id);
  const [cadence, setCadence] = useState<Cadence>("yearly");
  const [pending, setPending] = useState<string | null>(null);

  const buy = async (priceId: string) => {
    if (!user) {
      window.location.href = `/auth?redirect=/pricing`;
      return;
    }
    setPending(priceId);
    try {
      await openCheckout({ priceId, userId: user.id, customerEmail: user.email ?? undefined });
    } finally {
      setPending(null);
    }
  };

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
      <PaymentTestModeBanner />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] shadow-sm">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold text-foreground">CareFlow</span>
        </Link>
        {user ? (
          <Link to="/today" className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 hover:bg-card">
            Open app
          </Link>
        ) : (
          <Link to="/auth" className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 hover:bg-card">
            Log in
          </Link>
        )}
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pt-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(145_22%_70%)]/50 bg-[hsl(145_35%_92%)]/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[hsl(145_30%_22%)] backdrop-blur">
          <Sparkles className="h-3 w-3" /> Founding-member pricing — locked forever
        </span>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">Soft pricing for a softer life.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Start free. Upgrade when you're ready. Cancel anytime — your price stays the same for as long as you stay.
        </p>

        <div className="mx-auto mt-6 inline-flex rounded-full border border-border/60 bg-card/70 p-1 backdrop-blur">
          <button
            onClick={() => setCadence("monthly")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${cadence === "monthly" ? "bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)]" : "text-foreground/70"}`}
          >Monthly</button>
          <button
            onClick={() => setCadence("yearly")}
            className={`rounded-full px-4 py-1.5 text-sm transition ${cadence === "yearly" ? "bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)]" : "text-foreground/70"}`}
          >Yearly <span className="ml-1 text-[10px] uppercase tracking-wider opacity-80">save ~44%</span></button>
        </div>
      </section>

      <section className="mx-auto mt-12 grid w-full max-w-6xl gap-5 px-5 sm:grid-cols-3">
        {(["free", "pro", "family"] as const).map((key) => {
          const t = PLANS[key];
          const featured = "featured" in t && t.featured;
          const price = cadence === "monthly" ? t.monthly : t.yearly;
          const priceId = key === "free" ? null : (cadence === "monthly" ? (t as any).monthlyPriceId : (t as any).yearlyPriceId);
          const isCurrent = sub.plan === key && sub.isActive;
          return (
            <div
              key={t.name}
              className={`relative overflow-hidden rounded-3xl border p-6 backdrop-blur-md ${
                featured ? "border-[hsl(145_30%_28%)]/40 bg-card/90 shadow-cozy" : "border-border/40 bg-card/70"
              }`}
            >
              {featured && (
                <span className="absolute right-4 top-4 rounded-full bg-[hsl(145_30%_28%)] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[hsl(36_50%_96%)]">
                  Most loved
                </span>
              )}
              <div className="font-display text-xl text-foreground">{t.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl tracking-tight text-foreground">
                  {price === 0 ? "Free" : `$${cadence === "monthly" ? price.toFixed(2) : (price / 12).toFixed(2)}`}
                </span>
                {price > 0 && <span className="text-sm text-muted-foreground">/ mo</span>}
              </div>
              {price > 0 && cadence === "yearly" && (
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  ${price.toFixed(2)} billed yearly
                </div>
              )}
              {price > 0 && cadence === "monthly" && (
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">Billed monthly</div>
              )}
              {price === 0 && (
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">Always</div>
              )}

              <div className="mt-5">
                {key === "free" ? (
                  user ? (
                    <Button variant="outline" className="w-full" disabled>Your starting place</Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth">Get started free</Link>
                    </Button>
                  )
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>Current plan</Button>
                ) : (
                  <Button
                    onClick={() => priceId && buy(priceId)}
                    disabled={!priceId || checkoutLoading || pending === priceId}
                    className={`w-full ${featured ? "bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] hover:bg-[hsl(145_30%_24%)]" : ""}`}
                  >
                    {pending === priceId ? "Opening…" : `Choose ${t.name}`}
                  </Button>
                )}
              </div>

              <ul className="mt-6 space-y-2 text-sm text-foreground/80">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(145_30%_28%)]" /> <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Lifetime offer */}
      <section className="mx-auto mt-12 w-full max-w-3xl px-5">
        <div className="relative overflow-hidden rounded-3xl border border-[hsl(350_40%_70%)]/40 bg-gradient-to-br from-[hsl(350_60%_94%)] to-[hsl(36_50%_96%)] p-6 shadow-cozy backdrop-blur-md sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(350_55%_50%)]/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-[hsl(350_45%_35%)]">
                <Heart className="h-3 w-3" /> Founding offer — limited
              </div>
              <h3 className="mt-2 font-display text-2xl text-foreground">Lifetime Pro</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                One payment. CareFlow Pro for life. For the early believers who want to settle in and stay.
              </p>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl text-foreground">$129</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">one-time</div>
              <Button
                className="mt-3 bg-[hsl(350_45%_45%)] text-[hsl(36_50%_96%)] hover:bg-[hsl(350_45%_40%)]"
                disabled={checkoutLoading || pending === "lifetime_pro_onetime" || sub.plan === "lifetime"}
                onClick={() => buy("lifetime_pro_onetime")}
              >
                {sub.plan === "lifetime" ? "You have lifetime ♥" : pending === "lifetime_pro_onetime" ? "Opening…" : "Claim lifetime"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 w-full max-w-3xl px-5 pb-10">
        <div className="rounded-3xl border border-border/50 bg-card/85 p-6 shadow-cozy backdrop-blur-md sm:p-8">
          <h2 className="font-display text-2xl text-foreground sm:text-3xl">Gentle questions, honest answers</h2>
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="font-medium text-foreground">Can I cancel anytime?</dt>
              <dd className="mt-1 text-muted-foreground">Yes. Cancel from your account at any time. You'll keep access until the end of the period you've already paid for.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Refunds?</dt>
              <dd className="mt-1 text-muted-foreground">30-day money-back guarantee. Payments are handled by Paddle — refunds are processed through paddle.net or our support.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">What does the AI do with my data?</dt>
              <dd className="mt-1 text-muted-foreground">AI prompts go to Google and OpenAI via the Lovable AI Gateway with a 30-day retention. Your data is not used to train models. Full details in our <Link to="/privacy" className="underline">Privacy Policy</Link>.</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Will my price change?</dt>
              <dd className="mt-1 text-muted-foreground">As a founding member, your price is locked for as long as your subscription stays active.</dd>
            </div>
          </dl>
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