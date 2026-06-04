import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";
import { PhaseBadge } from "@/components/cycle/PhaseBadge";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { MaintenanceTab } from "@/components/home-hub/MaintenanceTab";
import { RhythmTab } from "@/components/home-hub/RhythmTab";
import { ZonesTab } from "@/components/home-hub/ZonesTab";
import { AnalyticsTab } from "@/components/home-hub/AnalyticsTab";
import HomeReset from "@/pages/HomeReset";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Sparkles, ListChecks, Sprout, Wrench, BarChart3, Home as HomeIcon,
  Pin, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/cards/SectionCard";
import { toast } from "sonner";
import { useResetChecklists } from "@/lib/reset-checklists";
import { ZoneTiles } from "@/components/home-hub/ZoneTiles";
import {
  getDefaultHomeHubTab, setDefaultHomeHubTab, type HomeHubTabId,
} from "@/lib/home-hub-prefs";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "It's late, friend";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Soft night";
}

type TabId = HomeHubTabId;

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard; comingSoon?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rhythm", label: "Rhythm", icon: Sparkles },
  { id: "reset", label: "Reset", icon: ListChecks },
  { id: "zones", label: "Zones", icon: Sprout },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <SectionCard title={title} accent="calm">
      <p className="text-sm text-muted-foreground">{blurb}</p>
      <p className="mt-2 text-xs text-muted-foreground">Shipping in an upcoming update — your data is already being collected so nothing is lost.</p>
    </SectionCard>
  );
}

export default function HomeHub() {
  const [tab, setTab] = useState<TabId>(() => getDefaultHomeHubTab());
  const [pinnedTab, setPinnedTab] = useState<TabId>(() => getDefaultHomeHubTab());
  const { state } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pinTab = (id: TabId) => {
    const next = pinnedTab === id ? "dashboard" : id;
    setPinnedTab(next);
    setDefaultHomeHubTab(next);
    toast.success(
      pinnedTab === id ? "Default tab cleared." : `"${TABS.find(t => t.id === id)?.label}" opens first now.`,
    );
  };

  return (
    <div className="relative space-y-5">
      {/* Ambient warm background to unify the page */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, hsl(var(--primary) / 0.08) 0%, transparent 60%)," +
            "radial-gradient(50% 40% at 90% 0%, rgba(251, 191, 165, 0.25) 0%, transparent 65%)," +
            "radial-gradient(50% 50% at 50% 100%, rgba(167, 243, 208, 0.18) 0%, transparent 65%)",
        }}
      />
      {/* ============ HEADER (Home Reset visual language) ============ */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100/70 via-amber-50/60 to-emerald-100/50 p-5 ring-1 ring-rose-200/50 shadow-soft sm:p-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-rose-700 shadow-sm ring-1 ring-white/60">
            <HomeIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70">{format(new Date(), "EEEE, MMMM d")}</p>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {greeting()}, {state.settings?.name ?? "friend"}.
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A calm command center for resets, rhythm, zones, and the invisible labor of running a home.
            </p>
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/today")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate("/today"); } }}
              aria-label="Open today's rhythm"
              className="mt-3 inline-flex cursor-pointer flex-wrap items-center gap-1.5 rounded-full p-1 -m-1 transition-colors hover:bg-foreground/5"
            >
              <MoonPhaseBadge />
              <ElementBadge />
              <PhaseBadge />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">Now</span>
            <div className="font-display text-3xl font-light tabular-nums tracking-tight">
              {format(now, "h:mm")}<span className="text-foreground/40">:{format(now, "ss")}</span>
              <span className="ml-1 text-sm font-normal text-foreground/60">{format(now, "a")}</span>
            </div>
          </div>
          <EnergyCheckIn />
          {state.settings?.lowEnergyMode && (
            <Badge className="rounded-full bg-moon-soft text-moon-foreground hover:bg-moon-soft">Low-energy mode on</Badge>
          )}
        </div>
       </div>
      </header>

      {/* Sticky tab strip — mobile-first, scrollable */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const pinned = pinnedTab === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex shrink-0 items-center gap-1 rounded-2xl border px-1 pl-2 pr-1 py-1 text-xs font-medium transition-all",
                  active
                    ? "border-rose-300/60 bg-gradient-to-br from-rose-100/80 to-amber-50/60 text-rose-700 shadow-[0_4px_18px_-6px_rgba(244,114,182,0.45)]"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:bg-card",
                )}
              >
                <button
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 py-0.5 pl-1.5 pr-1"
                >
                  <span className={cn(
                    "grid h-6 w-6 place-items-center rounded-lg",
                    active ? "bg-white/70 text-rose-700 ring-1 ring-white/60" : "bg-muted/60 text-foreground/70",
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {t.label}
                  {pinned && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label="default tab" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); pinTab(t.id); }}
                  title={pinned ? "Unpin default" : "Open this tab first next time"}
                  className={cn(
                    "ml-0.5 grid h-5 w-5 place-items-center rounded-full transition-all",
                    pinned ? "bg-primary/20 text-primary opacity-100" : "opacity-0 group-hover:opacity-100 hover:bg-muted",
                  )}
                >
                  <Pin className={cn("h-3 w-3", pinned && "fill-current")} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {tab === "dashboard" && (
        <>
          <CustomizableGrid
            pageKey="home-hub"
            sectionTitle="Your widgets"
            hero={<DashboardHero onOpenReset={() => setTab("reset")} />}
          />
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Checklist zones</h2>
              <button
                onClick={() => setTab("zones")}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all zones →
              </button>
            </div>
            <ZoneTiles onOpenZonesTab={() => setTab("zones")} />
          </section>
        </>
      )}

      {tab === "rhythm" && <RhythmTab />}

      {tab === "reset" && <HomeReset embedded />}

      {tab === "zones" && <ZonesTab />}

      {tab === "maintenance" && <MaintenanceTab />}

      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

/** Reset-style hero shown above the dashboard widget grid. */
function DashboardHero({ onOpenReset }: { onOpenReset: () => void }) {
  const reset = useResetChecklists({});
  const { state } = useStore();

  const activeLists = reset.lists.filter(l => !l.is_template);
  let remaining = 0;
  let inProgress = 0;
  for (const l of activeLists) {
    const roots = l.items.filter(i => !i.parent_id);
    const done = roots.filter(i => i.done).length;
    remaining += Math.max(0, roots.length - done);
    if (roots.length > 0 && done > 0 && done < roots.length) inProgress += 1;
  }
  const top3Done = state.tasks.filter(t => t.isTopThree && t.done).length;
  const top3Total = state.tasks.filter(t => t.isTopThree).length;
  const nextAppt = state.appointments
    .filter(a => {
      const d = new Date((a.date ?? "") + (a.time ? `T${a.time}` : "T00:00"));
      return d.getTime() >= Date.now();
    })
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];

  return (
    <article
      aria-label="Today at a glance"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100/70 to-amber-50/40 p-5 ring-1 ring-emerald-200/60 shadow-soft sm:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/60">
        Today at a glance
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-emerald-700 ring-1 ring-white/60 shadow-sm">
          <LayoutDashboard className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Your soft command center
          </h2>
          <p className="mt-1 text-xs text-foreground/70">
            Resets, top three, and what's next — all in one calm view.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <HeroStat label="reset tasks" value={remaining} accent="emerald" />
        <HeroStat label="top 3 done" value={`${top3Done}/${top3Total || 0}`} accent="rose" />
        <HeroStat
          label="next up"
          value={nextAppt ? format(new Date(nextAppt.date + (nextAppt.time ? `T${nextAppt.time}` : "T00:00")), "MMM d · h:mm a") : "—"}
          accent="violet"
          small
        />
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white/70 p-3 ring-1 ring-white/60 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/80">
          {inProgress > 0
            ? `${inProgress} reset${inProgress > 1 ? "s" : ""} in progress.`
            : remaining > 0
              ? `${remaining} small step${remaining > 1 ? "s" : ""} waiting in Reset.`
              : "Everything's tidy. Take a breath. ✨"}
        </p>
        <button
          onClick={onOpenReset}
          className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
        >
          Open reset <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function HeroStat({ label, value, accent, small }: { label: string; value: React.ReactNode; accent: "emerald" | "rose" | "violet"; small?: boolean }) {
  const tone =
    accent === "emerald" ? "bg-emerald-100/70 text-emerald-700" :
    accent === "rose" ? "bg-rose-100/70 text-rose-700" :
    "bg-violet-100/70 text-violet-700";
  return (
    <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/60 backdrop-blur-sm">
      <p className={cn("inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", tone)}>{label}</p>
      <p className={cn("mt-1 font-display font-semibold tabular-nums leading-tight", small ? "text-sm" : "text-2xl")}>
        {value}
      </p>
    </div>
  );
}