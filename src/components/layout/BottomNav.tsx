import { NavLink } from "react-router-dom";
import { MOBILE_NAV, NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";

export function BottomNav() {
  const [open, setOpen] = useState(false);
  const primary = MOBILE_NAV.slice(0, 4);
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
