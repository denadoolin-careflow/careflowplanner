import { NavLink } from "react-router-dom";
import { MOBILE_NAV, NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Moon, Sun, MoonStar, Settings2, GripVertical, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";

const NAV_ORDER_KEY = "careflow:mobile-nav-order";
const DEFAULT_NAV_IDS = MOBILE_NAV.slice(0, 6).map(n => n.to);

function loadNavOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_NAV_IDS;
  try {
    const raw = window.localStorage.getItem(NAV_ORDER_KEY);
    if (!raw) return DEFAULT_NAV_IDS;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.length ? ids.slice(0, 6) : DEFAULT_NAV_IDS;
  } catch {
    return DEFAULT_NAV_IDS;
  }
}

function useNavOrder() {
  const [ids, setIds] = useState<string[]>(loadNavOrder);
  useEffect(() => {
    try { window.localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(ids)); } catch {}
    // Notify other mounted nav instances.
    window.dispatchEvent(new CustomEvent("careflow:mobile-nav-order", { detail: ids }));
  }, [ids]);
  useEffect(() => {
    const fn = (e: Event) => {
      const next = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(next)) setIds(next);
    };
    window.addEventListener("careflow:mobile-nav-order", fn as EventListener);
    return () => window.removeEventListener("careflow:mobile-nav-order", fn as EventListener);
  }, []);
  return [ids, setIds] as const;
}

/** All possible nav destinations available for the bottom bar. */
const ALL_DESTINATIONS = (() => {
  // Merge MOBILE_NAV + the most useful items from NAV, dedupe by `to`.
  const seen = new Map<string, { to: string; label: string; icon: any }>();
  for (const item of MOBILE_NAV) seen.set(item.to, item);
  for (const item of NAV) if (!seen.has(item.to)) seen.set(item.to, item);
  return Array.from(seen.values());
})();

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [navIds, setNavIds] = useNavOrder();
  const primary = useMemo(() => {
    return navIds
      .map(id => ALL_DESTINATIONS.find(d => d.to === id))
      .filter(Boolean) as typeof ALL_DESTINATIONS;
  }, [navIds]);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";
  const { state, setLowEnergyMode } = useStore();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[env(safe-area-inset-bottom,0)] lg:hidden">
      <div className="mx-auto max-w-screen-md rounded-3xl border border-border/50 bg-card/60 px-1 pb-1 pt-1 shadow-lg backdrop-blur-xl">
        <ul className="grid grid-cols-7">
          {primary.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => haptics.tap()}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-h-[44px] flex-col items-center gap-0.5 rounded-xl py-2 text-[9.5px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-2xl transition-all",
                        isActive
                          ? "bg-gradient-to-br from-primary/20 to-accent/20 shadow-[0_0_18px_-2px_hsl(var(--primary)/0.55)]"
                          : "bg-transparent"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110")} />
                    </span>
                    <span className="leading-none">{label}</span>
                    {isActive && (
                      <span className="absolute -top-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary/80 shadow-[0_0_8px_hsl(var(--primary)/0.7)]" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          <li>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                onClick={() => haptics.tap()}
                onContextMenu={(e) => {
                  e.preventDefault();
                  haptics.longPress();
                  setCustomizeOpen(true);
                }}
                className="flex min-h-[44px] w-full flex-col items-center gap-0.5 rounded-xl py-2 text-[9.5px] font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="grid h-8 w-8 place-items-center rounded-2xl">
                  <Menu className="h-4 w-4" />
                </span>
                <span className="leading-none">More</span>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Navigate</SheetTitle>
                </SheetHeader>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-xl"
                    onClick={() => { setOpen(false); setCustomizeOpen(true); haptics.tap(); }}
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Customize bottom nav
                  </Button>
                </div>
                <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-card/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="bn-dark" className="flex items-center gap-2 text-sm">
                      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      Dark mode
                    </Label>
                    <Switch
                      id="bn-dark"
                      checked={isDark}
                      onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="bn-low" className="flex items-center gap-2 text-sm">
                      <MoonStar className="h-4 w-4" />
                      Low-energy mode
                    </Label>
                    <Switch
                      id="bn-low"
                      checked={state.settings.lowEnergyMode}
                      onCheckedChange={setLowEnergyMode}
                    />
                  </div>
                </div>
                <ul className="mt-4 grid grid-cols-3 gap-2 pb-4">
                  {NAV.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === "/"}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex flex-col items-center gap-1 rounded-xl border border-border/60 bg-card/60 px-2 py-3 text-xs font-medium",
                            isActive ? "text-primary border-primary/40" : "text-muted-foreground"
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-center leading-tight">{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </div>
      <CustomizeNavSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        ids={navIds}
        onChange={setNavIds}
      />
    </nav>
  );
}

function CustomizeNavSheet({
  open, onOpenChange, ids, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ids: string[];
  onChange: (next: string[]) => void;
}) {
  const [working, setWorking] = useState<string[]>(ids);
  useEffect(() => { if (open) setWorking(ids); }, [open, ids]);

  const toggle = (to: string) => {
    haptics.tap();
    setWorking(prev => {
      if (prev.includes(to)) return prev.filter(x => x !== to);
      if (prev.length >= 6) return prev; // cap at 6
      return [...prev, to];
    });
  };

  const move = (from: number, dir: -1 | 1) => {
    setWorking(prev => {
      const next = [...prev];
      const to = from + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[from], next[to]] = [next[to], next[from]];
      haptics.snap();
      return next;
    });
  };

  const reset = () => { setWorking(DEFAULT_NAV_IDS); haptics.warning(); };

  const save = () => {
    onChange(working.length ? working : DEFAULT_NAV_IDS);
    haptics.success();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Customize bottom nav</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-xs text-muted-foreground">Pick up to 6 destinations. Drag the arrows to reorder.</p>

        <div className="mt-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In your bar ({working.length}/6)</div>
          <ul className="space-y-1.5">
            {working.map((to, i) => {
              const dest = ALL_DESTINATIONS.find(d => d.to === to);
              if (!dest) return null;
              const Icon = dest.icon;
              return (
                <li key={to} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-medium">{dest.label}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, -1)} aria-label="Move up">↑</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(i, 1)} aria-label="Move down">↓</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(to)} aria-label="Remove">✕</Button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Add destination</div>
          <ul className="grid grid-cols-3 gap-2">
            {ALL_DESTINATIONS.filter(d => !working.includes(d.to)).map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <button
                  type="button"
                  onClick={() => toggle(to)}
                  disabled={working.length >= 6}
                  className="flex w-full flex-col items-center gap-1 rounded-xl border border-border/60 bg-card/60 px-2 py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sticky bottom-0 mt-5 flex gap-2 bg-background/95 pb-safe pt-3 backdrop-blur">
          <Button variant="ghost" className="flex-1" onClick={reset}>Reset</Button>
          <Button className="flex-1 gap-1.5" onClick={save}><Check className="h-4 w-4" /> Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
