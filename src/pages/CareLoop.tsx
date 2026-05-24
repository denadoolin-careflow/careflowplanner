import { Link } from "react-router-dom";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Inbox, Sun, Compass, Wind, Sparkles, Leaf, Settings as Cog } from "lucide-react";
import {
  useCareProfile, careHeaderForSeason, PILLAR_META, SEASON_META,
} from "@/lib/care-methodology";

const PHASES = [
  {
    id: "capture", letter: "C", title: "Capture",
    tagline: "Get it out of your head.",
    icon: Inbox, accent: "warm" as const,
    links: [
      { to: "/inbox", label: "Inbox" },
      { to: "/mental-load", label: "Brain dump" },
      { to: "/notes", label: "Notes" },
      { to: "/someday", label: "Not today (parking lot)" },
    ],
  },
  {
    id: "anchor", letter: "A", title: "Anchor",
    tagline: "Choose what matters today.",
    icon: Compass, accent: "sage" as const,
    links: [
      { to: "/today", label: "Today" },
      { to: "/plan", label: "Plan with energy" },
      { to: "/goals", label: "Goals" },
    ],
  },
  {
    id: "rhythm", letter: "R", title: "Rhythm",
    tagline: "Move through the day with support.",
    icon: Sparkles, accent: "calm" as const,
    links: [
      { to: "/routines", label: "Routines" },
      { to: "/habits", label: "Habits" },
      { to: "/focus", label: "Focus timer" },
      { to: "/calendar", label: "Calendar" },
    ],
  },
  {
    id: "exhale", letter: "E", title: "Exhale",
    tagline: "Close loops and soften the landing.",
    icon: Wind, accent: "warm" as const,
    links: [
      { to: "/journal", label: "Journal" },
      { to: "/review", label: "Daily review" },
      { to: "/reset/week", label: "Weekly reset" },
    ],
  },
];

export default function CareLoop() {
  const { profile } = useCareProfile();
  const seasonMeta = profile.season ? SEASON_META[profile.season] : null;

  return (
    <div className="space-y-6">
      <div className="cozy-card overflow-hidden">
        <div className="relative gradient-sage p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(60% 80% at 80% 20%, hsl(var(--primary)/0.18), transparent 70%)" }}
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">CareFlow Loop</p>
              <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                {careHeaderForSeason(profile.season)}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Turn life's load into a gentle repeatable loop. Capture · Anchor · Rhythm · Exhale.
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

      <div className="grid gap-4 sm:grid-cols-2">
        {PHASES.map((p) => {
          const Icon = p.icon;
          return (
            <SectionCard
              key={p.id}
              accent={p.accent}
              title={
                <span className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-semibold text-primary">
                    {p.letter}
                  </span>
                  <span>{p.title}</span>
                </span>
              }
              subtitle={p.tagline}
              action={<Icon className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="flex flex-wrap gap-1.5">
                {p.links.map((l) => (
                  <Button key={l.to} asChild variant="outline" size="sm" className="rounded-full">
                    <Link to={l.to}>{l.label}</Link>
                  </Button>
                ))}
              </div>
            </SectionCard>
          );
        })}
      </div>

      {profile.mvp_items.length > 0 && (
        <SectionCard title="Your Minimum Viable Day" subtitle="On heavy days, just these are enough." accent="sage">
          <ul className="grid gap-2 sm:grid-cols-2">
            {profile.mvp_items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm">
                <Leaf className="h-4 w-4 text-primary/70" /> {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {profile.pillars_enabled.length > 0 && (
        <SectionCard title="Your pillars" subtitle="Tap to enter that space." accent="calm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profile.pillars_enabled.map((p) => {
              const meta = PILLAR_META[p];
              return (
                <Link
                  key={p}
                  to={meta.route}
                  className="group rounded-2xl border border-border/60 bg-card/60 p-4 transition-all hover:border-primary/40 hover:bg-card"
                >
                  <p className="font-display text-base font-semibold group-hover:text-primary">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}