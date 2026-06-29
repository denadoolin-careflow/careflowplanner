import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar, MobileSidebarTrigger } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AtmosphereAmbient } from "@/components/atmospheres/AtmosphereAmbient";
import { HeaderQuickSettings } from "./HeaderQuickSettings";
import { useAutoAtmosphereResolver, useAtmosphere } from "@/lib/atmospheres";
import { QuickAddFab } from "@/components/quick-add/QuickAddFab";
import { CareGuideFab } from "@/components/care/CareGuideFab";
import { CombinedFab } from "@/components/quick-add/CombinedFab";
import { AICaptureDialog } from "@/components/care/AICaptureDialog";
import { CareyChat } from "@/components/carey/CareyChat";
import { useStore } from "@/lib/store";
import { NAV } from "@/lib/nav";
import { UniversalSearchBar } from "@/components/search/UniversalSearchBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { FocusPanel } from "@/components/focus/FocusPanel";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { WhatsNewPopover } from "@/components/updates/WhatsNewPopover";
import { GlobalTaskEditor } from "@/components/tasks/GlobalTaskEditor";
import { UpgradePromptHost } from "@/components/UpgradePromptHost";
import { useEffect } from "react";
import { applyAnimIntensity, readAnimIntensity } from "@/components/settings/AtmosphereFeelSection";
import { applyFontPrefs } from "@/lib/font-prefs";
import { installGlobalHaptics } from "@/lib/haptics";
import { CareFlowLogo } from "@/components/widgets/CareFlowLogo";
import { Link } from "react-router-dom";
import { HeaderNowStrip } from "./HeaderNowStrip";
import { CapacityChip } from "@/components/header/CapacityChip";

export function AppLayout() {
  const { state } = useStore();
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
          <header className="sticky top-0 z-20 flex flex-nowrap items-center justify-between gap-2 border-b border-border/50 bg-background/70 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
            <div className="flex min-w-0 flex-nowrap items-center gap-2">
              <MobileSidebarTrigger />
              <div className="min-w-0">
                <p className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                  CareFlow · Plan · Care · Grow
                </p>
                <h1 className="font-display text-base font-semibold leading-tight sm:text-2xl">{current.label}</h1>
              </div>
            </div>
            <div className="flex flex-nowrap items-center gap-1 sm:gap-3">
              <div className="hidden sm:inline-flex">
                <CapacityChip />
              </div>
              <HeaderNowStrip />
              <UniversalSearchBar />
              <div className="hidden sm:block">
                <NotificationCenter />
              </div>
              <div className="hidden md:block">
                <WhatsNewPopover />
              </div>
              <div className="hidden md:block">
                <HeaderQuickSettings />
              </div>
              <Link to="/" aria-label="CareFlow home" className="ml-1 hidden sm:inline-flex">
                <CareFlowLogo size={32} />
              </Link>
            </div>
          </header>
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
      <CareGuideFab hideButton />
      <CombinedFab />
      <BottomNav />
      <CommandPalette />
      <FocusPanel />
      <GlobalTaskEditor />
      <UpgradePromptHost />
      <AICaptureDialog />
      <CareyChat />
    </div>
  );
}
