import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, MobileSidebarTrigger } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { AtmospherePicker } from "@/components/atmospheres/AtmospherePicker";
import { AtmosphereAmbient } from "@/components/atmospheres/AtmosphereAmbient";
import { useAutoAtmosphereResolver } from "@/lib/atmospheres";
import { QuickAddFab } from "@/components/quick-add/QuickAddFab";
import { AIAssistantFab } from "@/components/ai/AIAssistantFab";
import { useStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NAV } from "@/lib/nav";
import { RoutinesStrip } from "@/components/routines/RoutinesStrip";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { PanelPicker } from "@/components/workspace/PanelPicker";
import { AuroraClock } from "@/components/cards/AuroraClock";
import { FocusPanel } from "@/components/focus/FocusPanel";

export function AppLayout() {
  const { state, setLowEnergyMode } = useStore();
  const { pathname } = useLocation();
  const current = NAV.find(n => n.to === pathname) ?? NAV[0];
  useAutoAtmosphereResolver({ lowEnergy: state.settings.lowEnergyMode });

  return (
    <div className="min-h-screen w-full gradient-dawn">
      <AtmosphereAmbient />
      <div className="flex w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-md lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <MobileSidebarTrigger />
              <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">CareFlow</p>
              <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">{current.label}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <UniversalSearchBar />
              <PanelPicker />
              <AuroraClock compact className="hidden md:flex shrink-0" />
              <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 sm:flex">
                <Label htmlFor="low-energy" className="text-xs text-muted-foreground">Low-energy mode</Label>
                <Switch id="low-energy" checked={state.settings.lowEnergyMode} onCheckedChange={setLowEnergyMode} />
              </div>
              <AtmospherePicker />
              <ThemeToggle />
            </div>
          </header>
          <RoutinesStrip />
          <main className="flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <QuickAddFab />
      <AIAssistantFab />
      <BottomNav />
      <CommandPalette />
      <FocusPanel />
    </div>
  );
}
