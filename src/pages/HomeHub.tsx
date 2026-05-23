import { useState } from "react";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";
import { MaintenanceTab } from "@/components/home-hub/MaintenanceTab";
import HomeReset from "@/pages/HomeReset";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Sparkles, ListChecks, Sprout, Wrench, BarChart3,
} from "lucide-react";
import { SectionCard } from "@/components/cards/SectionCard";

type TabId = "dashboard" | "rhythm" | "reset" | "zones" | "maintenance" | "analytics";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard; comingSoon?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "rhythm", label: "Rhythm", icon: Sparkles, comingSoon: true },
  { id: "reset", label: "Reset", icon: ListChecks },
  { id: "zones", label: "Zones", icon: Sprout, comingSoon: true },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "analytics", label: "Analytics", icon: BarChart3, comingSoon: true },
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
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="space-y-5">
      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col gap-3 p-6 gradient-sage sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your home, gently organized</p>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">Home</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A calm command center for routines, resets, caregiving, and the invisible labor of running a household. One small action at a time.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <MoonPhaseBadge />
              <ElementBadge />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky tab strip — mobile-first, scrollable */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-primary/45 bg-primary/15 text-primary shadow-[0_0_12px_-2px_hsl(var(--primary)/0.45)]"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:bg-card",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.comingSoon && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "dashboard" && <CustomizableGrid pageKey="home-hub" />}

      {tab === "rhythm" && (
        <ComingSoon
          title="Daily Home Rhythm — coming next"
          blurb="A gentle Morning · Afternoon · Evening · Night Reset planner. Drag routines, chores, meals, and caregiving tasks into the slot that fits your day."
        />
      )}

      {tab === "reset" && <HomeReset />}

      {tab === "zones" && (
        <ComingSoon
          title="Cleaning Zones — coming next"
          blurb="A visual grid of Kitchen, Bathrooms, Bedrooms, Laundry, Outdoors, Living Room, and Playroom — with recurring schedules, progress bars, and drag-and-drop tasks."
        />
      )}

      {tab === "maintenance" && <MaintenanceTab />}

      {tab === "analytics" && (
        <ComingSoon
          title="Home Analytics — coming later"
          blurb="Calming heatmaps and progress visuals for routines completed, cleaning consistency, busiest home days, and caregiving load."
        />
      )}
    </div>
  );
}