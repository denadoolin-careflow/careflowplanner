import { Link } from "react-router-dom";
import { Inbox, Compass, Sparkles, Wind, Leaf, Settings as Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { PhaseCard } from "@/components/care/PhaseCard";
import { AnchorFlowCard } from "@/components/care/AnchorFlowCard";
import { useCareProfile, careHeaderForSeason, SEASON_META } from "@/lib/care-methodology";

/**
 * CARE Hub — the home base for the Capture → Anchor → Rhythm → Exhale loop.
 * Replaces the legacy /care landing.
 */
export default function CareHub() {
  const { profile } = useCareProfile();
  const seasonMeta = profile.season ? SEASON_META[profile.season] : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="cozy-card overflow-hidden">
        <div className="relative gradient-sage p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(60% 80% at 80% 20%, hsl(var(--primary)/0.18), transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CARE Hub</p>
              <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {careHeaderForSeason(profile.season)}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Capture what matters. Anchor to what matters most. Find a sustainable rhythm. Create space to exhale.
              </p>
              {seasonMeta && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs">
                  <Leaf className="h-3.5 w-3.5 text-primary" />
                  Season: <strong className="text-foreground">{seasonMeta.label}</strong>
                </div>
              )}
            </div>
            <Button asChild variant="outline" size="sm" className="self-start sm:self-end">
              <Link to="/onboarding"><Cog className="mr-1 h-3.5 w-3.5" /> Adjust setup</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* The four phases */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PhaseCard
          onClick={() => window.dispatchEvent(new Event("careflow:ai-capture"))}
          letter="C"
          title="Capture"
          tagline="Capture"
          description="Brain-dump anything — AI sorts it into a task, idea, grocery, or journal."
          icon={Inbox}
          tint="from-sky-400/20 via-sky-300/5 to-transparent"
          iconTint="bg-sky-500/15 text-sky-600"
          delay={0}
        />
        <PhaseCard
          to="/today"
          letter="A"
          title="Anchor"
          tagline="Anchor"
          description="Connect today's actions to what matters most."
          icon={Compass}
          tint="from-amber-400/20 via-amber-300/5 to-transparent"
          iconTint="bg-amber-500/15 text-amber-600"
          delay={0.05}
        />
        <PhaseCard
          to="/routines"
          letter="R"
          title="Rhythm"
          tagline="Rhythm"
          description="Move through the day with sustainable routines."
          icon={Sparkles}
          tint="from-emerald-400/20 via-emerald-300/5 to-transparent"
          iconTint="bg-emerald-500/15 text-emerald-600"
          delay={0.1}
        />
        <PhaseCard
          to="/journal"
          letter="E"
          title="Exhale"
          tagline="Exhale"
          description="Reflect, celebrate, and close loops gently."
          icon={Wind}
          tint="from-violet-400/20 via-violet-300/5 to-transparent"
          iconTint="bg-violet-500/15 text-violet-600"
          delay={0.15}
        />
      </div>

      {/* Anchors */}
      <AnchorFlowCard />

      {/* Minimum viable day from existing profile */}
      {profile.mvp_items.length > 0 && (
        <SectionCard
          title="Your Minimum Viable Day"
          subtitle="On heavy days, just these are enough."
          accent="calm"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.mvp_items.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm"
              >
                <Leaf className="h-4 w-4 text-primary/70" /> {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
