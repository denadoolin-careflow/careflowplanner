import { NavLink } from "react-router-dom";
import { MOBILE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div className="mx-auto max-w-screen-md border-t border-border/60 bg-card/90 backdrop-blur-md">
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
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
        </ul>
      </div>
    </nav>
  );
}
