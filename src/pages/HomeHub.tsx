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
    <div className="space-y-5">
      {/* ============ HEADER (Home Reset visual language) ============ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100/80 text-emerald-700 shadow-soft ring-1 ring-emerald-200/60">
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
      </header>

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

      {tab === "rhythm" && <RhythmTab />}

      {tab === "reset" && <HomeReset />}

      {tab === "zones" && <ZonesTab />}

      {tab === "maintenance" && <MaintenanceTab />}

      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}