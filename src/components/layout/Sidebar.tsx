import { NavLink } from "react-router-dom";
import { NAV } from "@/lib/nav";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border bg-sidebar p-4">
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
          <Heart className="h-4 w-4" fill="currentColor" />
        </div>
        <div>
          <div className="font-display text-lg font-semibold leading-none">CareFlow</div>
          <div className="text-xs text-muted-foreground">a gentle planner</div>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-0.5 overflow-y-auto pr-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-primary-soft text-foreground shadow-soft"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
