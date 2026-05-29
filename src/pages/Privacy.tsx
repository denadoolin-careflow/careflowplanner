import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function Privacy() {
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
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: May 29, 2026</p>

        <div className="prose prose-stone mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-foreground/85">
          <section>
            <h2 className="font-display text-2xl text-foreground">Who we are</h2>
            <p>
              CareFlow Planner ("CareFlow", "we", "us") is operated by Dena Doolin, based in the United States.
              For any privacy questions, email <a className="underline" href="mailto:hello@careflowplanner.app">hello@careflowplanner.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">What we collect</h2>
            <ul className="list-disc pl-5">
              <li><strong>Account information</strong> — email and name when you sign up.</li>
              <li><strong>Planning content you create</strong> — tasks, routines, habits, journal entries, meals, home maintenance notes, and similar productivity data.</li>
              <li><strong>Sensitive personal reflections</strong> — cycle logs, mental load check-ins, mood, and caregiving notes you choose to enter. You are never required to enter these.</li>
              <li><strong>Uploads</strong> — meal images, home documents, and other attachments you upload.</li>
              <li><strong>Device and usage signals</strong> — basic technical information needed to operate the service (browser, device type, error logs).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Why we use it</h2>
            <p>To run the service, sync your data across devices, personalize AI suggestions you ask for, and improve reliability.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">AI features</h2>
            <p>
              When you use an AI feature (planning suggestions, journal recaps, voice capture, etc.), the relevant
              content is sent to Google or OpenAI through the Lovable AI Gateway. Providers retain prompts for
              up to 30 days for abuse monitoring and <strong>do not use them to train their models</strong>. You
              can use CareFlow without ever using an AI feature.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Sharing</h2>
            <p>We do not sell your personal information. We share data only with subprocessors that help us run the service:</p>
            <ul className="list-disc pl-5">
              <li>Lovable Cloud (Supabase) — database, authentication, file storage</li>
              <li>Lovable AI Gateway (Google, OpenAI) — AI feature processing</li>
              <li>Paddle — payments and subscription billing (Paddle is the merchant of record)</li>
              <li>Google Maps — location autocomplete (only when you use map features)</li>
              <li>Google Calendar — only if you choose to connect it</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Storage and security</h2>
            <p>Your data is encrypted in transit and at rest. Row-level security ensures only you can access your own content. Servers are located in the United States.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Your rights</h2>
            <p>
              You can export, correct, or delete your data at any time by emailing
              <a className="underline" href="mailto:hello@careflowplanner.app"> hello@careflowplanner.app</a>.
              We respond within 30 days. When you delete your account, your data is removed from active systems
              immediately and from backups within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Children</h2>
            <p>CareFlow is not intended for users under 16. We do not knowingly collect data from anyone under 16. If we learn of an account belonging to a minor, we will remove it.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Analytics</h2>
            <p>We plan to add privacy-friendly analytics in the future. We will update this policy and notify users before enabling it.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Changes</h2>
            <p>If we make material changes to this policy, we will notify you by email and in-app before they take effect.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-foreground">Contact</h2>
            <p><a className="underline" href="mailto:hello@careflowplanner.app">hello@careflowplanner.app</a></p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-sm text-muted-foreground">
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
          <Link to="/pricing" className="underline hover:text-foreground">Pricing</Link>
        </div>
      </main>
    </div>
  );
}