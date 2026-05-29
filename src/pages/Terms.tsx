import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function Terms() {
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
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(145_30%_28%)] text-[hsl(36_50%_96%)] shadow-sm">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold text-foreground">CareFlow</span>
        </Link>
        <Link to="/pricing" className="rounded-full border border-border/60 bg-card/70 px-4 py-2 text-sm text-foreground/90 hover:bg-card">
          Pricing
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-6">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: May 29, 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground/85">
          <section>
            <h2 className="font-display text-2xl text-foreground">1. Acceptance</h2>
            <p>By creating a CareFlow account or using the service, you agree to these Terms. If you do not agree, please do not use CareFlow.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">2. Your account</h2>
            <p>You must be at least 16 years old. You are responsible for keeping your login credentials secure and for activity that happens under your account.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">3. Acceptable use</h2>
            <p>Do not use CareFlow to break the law, harm others, distribute malware, scrape the service, or attempt to bypass usage limits or AI safeguards. We may suspend accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">4. Subscriptions and billing</h2>
            <p>
              Paid subscriptions are billed through <strong>Paddle.com Inc.</strong>, which acts as the merchant of
              record. Paddle collects payment, calculates and remits applicable taxes, and handles billing-related
              support. Subscriptions renew automatically at the listed price until you cancel.
            </p>
            <p>Founding-member pricing, when offered, remains in effect for as long as your subscription stays continuously active. Lapses end the founding rate; resubscribing uses then-current pricing.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">5. Refunds and cancellation</h2>
            <p>
              You can cancel anytime from your account; cancellation stops the next renewal. Refunds are handled
              under Paddle's refund policy. EU/UK consumers also have a 14-day statutory withdrawal right, except
              once digital service performance has begun with your express consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">6. Your content</h2>
            <p>You own the content you create in CareFlow. You grant us a limited license to store, process, and display it solely to operate the service for you. We do not sell your content or use it to train AI models.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">7. AI features</h2>
            <p><strong>AI output may be inaccurate, incomplete, or misleading.</strong> Treat AI suggestions as starting points, not as professional advice. Verify anything important before acting on it.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">8. Medical disclaimer</h2>
            <p>
              <strong>CareFlow is not a medical device and does not provide medical advice, diagnosis, or
              treatment.</strong> Cycle tracking, mood, mental load, and caregiving features are for personal
              reflection and organization only. Always consult a licensed clinician for medical decisions and do
              not rely on CareFlow in any emergency.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">9. Service availability</h2>
            <p>We work hard to keep CareFlow reliable but we do not guarantee uninterrupted or error-free service. Features may change as the product evolves.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">10. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, CareFlow and its operator are not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the amount you paid for the service in the 12 months before the claim arose.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">11. Termination</h2>
            <p>You may delete your account at any time. We may suspend or terminate accounts that violate these Terms or that have been inactive for an extended period after notice.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">12. Governing law</h2>
            <p>These Terms are governed by the laws of the State of Indiana, United States, without regard to its conflict-of-laws rules. Disputes will be brought in the state or federal courts located in Indiana.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">13. Changes</h2>
            <p>We may update these Terms from time to time. If we make material changes, we will notify you in-app or by email before they take effect.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">14. Contact</h2>
            <p><a className="underline" href="mailto:hello@careflowplanner.app">hello@careflowplanner.app</a></p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-sm text-muted-foreground">
          <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>
          <Link to="/pricing" className="underline hover:text-foreground">Pricing</Link>
        </div>
      </main>
    </div>
  );
}