import { NavLink } from "react-router-dom";
import { MOBILE_NAV, NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Moon, Sun, MoonStar } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { useStore } from "@/lib/store";
import { haptics } from "@/lib/haptics";

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const primary = MOBILE_NAV.slice(0, 6);
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
                    "group relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[9.5px] font-medium transition-colors",
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
                className="flex w-full flex-col items-center gap-0.5 rounded-xl py-2 text-[9.5px] font-medium text-muted-foreground hover:text-foreground"
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
    </nav>
  );
}
