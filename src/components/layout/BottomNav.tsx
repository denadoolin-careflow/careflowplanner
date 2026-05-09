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

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const primary = MOBILE_NAV.slice(0, 4);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";
  const { state, setLowEnergyMode } = useStore();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div className="mx-auto max-w-screen-md border-t border-border/60 bg-card/90 backdrop-blur-md">
        <ul className="grid grid-cols-5">
          {primary.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger className="flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground">
                <Menu className="h-5 w-5" />
                Menu
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
