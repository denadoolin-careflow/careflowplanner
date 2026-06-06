import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar, MobileSidebarTrigger } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { AtmospherePicker } from "@/components/atmospheres/AtmospherePicker";
import { AtmosphereAmbient } from "@/components/atmospheres/AtmosphereAmbient";
import { useAutoAtmosphereResolver, useAtmosphere } from "@/lib/atmospheres";
import { QuickAddFab } from "@/components/quick-add/QuickAddFab";
import { AIAssistantFab } from "@/components/ai/AIAssistantFab";
import { CombinedFab } from "@/components/quick-add/CombinedFab";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BatteryLow, BatteryMedium } from "lucide-react";
import { NAV } from "@/lib/nav";
import { RoutinesStrip } from "@/components/routines/RoutinesStrip";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { PanelPicker } from "@/components/workspace/PanelPicker";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { FocusPanel } from "@/components/focus/FocusPanel";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { GlobalTaskEditor } from "@/components/tasks/GlobalTaskEditor";
import { UpgradePromptHost } from "@/components/UpgradePromptHost";
import { useEffect } from "react";
import { applyAnimIntensity, readAnimIntensity } from "@/components/settings/AtmosphereFeelSection";
import { applyFontPrefs } from "@/lib/font-prefs";
import { installGlobalHaptics } from "@/lib/haptics";
import { CareFlowLogo } from "@/components/widgets/CareFlowLogo";
import { Link } from "react-router-dom";
import { HeaderNowStrip } from "./HeaderNowStrip";

export function AppLayout() {
  const { state, setLowEnergyMode } = useStore();
  const { pathname } = useLocation();
  const current = NAV.find(n => n.to === pathname) ?? NAV[0];
  useAutoAtmosphereResolver({ lowEnergy: state.settings.lowEnergyMode });
  const { current: atmoId } = useAtmosphere();
  useEffect(() => { applyAnimIntensity(readAnimIntensity()); applyFontPrefs(); installGlobalHaptics(); }, []);
  useEffect(() => { applyFontPrefs(); }, [atmoId]);
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen w-full gradient-dawn">
      <AtmosphereAmbient />
      <div className="flex w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border/50 bg-background/70 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <MobileSidebarTrigger />
              <div className="min-w-0">
                <p className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">CareFlow</p>
                <h1 className="font-display text-base font-semibold leading-tight sm:text-2xl">{current.label}</h1>
              </div>
            </div>
            {/* Mobile: keep only search + theme. Secondary actions live in sidebar / bottom-nav "More". */}
            <div className="flex items-center gap-1 sm:gap-3">
              <HeaderNowStrip />
              <UniversalSearchBar />
              <div className="hidden items-center gap-2 sm:flex sm:gap-3">
                <NotificationCenter />
                <PanelPicker />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Toggle low-energy mode"
                      aria-pressed={state.settings.lowEnergyMode}
                      onClick={() => setLowEnergyMode(!state.settings.lowEnergyMode)}
                      className={`h-9 w-9 rounded-full ${state.settings.lowEnergyMode ? "text-primary bg-primary/10" : ""}`}
                    >
                      {state.settings.lowEnergyMode ? <BatteryLow className="h-4 w-4" /> : <BatteryMedium className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Low-energy mode {state.settings.lowEnergyMode ? "on" : "off"}
                  </TooltipContent>
                </Tooltip>
                <AtmospherePicker />
              </div>
              <ThemeToggle />
              <Link to="/" aria-label="CareFlow home" className="ml-1 inline-flex">
                <CareFlowLogo size={32} />
              </Link>
            </div>
          </header>
          <RoutinesStrip />
          <main className="flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
            <div className="mx-auto w-full max-w-6xl">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
                  style={{ willChange: "opacity" }}
                >
                  <WorkspaceShell>
                    <Outlet />
                  </WorkspaceShell>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
      <QuickAddFab hideButton />
      <AIAssistantFab hideButton />
      <CombinedFab />
      <BottomNav />
      <CommandPalette />
      <FocusPanel />
      <GlobalTaskEditor />
      <UpgradePromptHost />
      <AICaptureDialog />
    </div>
  );
}
