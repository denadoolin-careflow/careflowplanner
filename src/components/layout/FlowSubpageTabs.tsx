import { NavLink, useLocation } from "react-router-dom";
import { NAV, NAV_GROUPS, findSubpageFamily } from "@/lib/nav";
import { cn } from "@/lib/utils";

const labelFor = (to: string) =>
  NAV_GROUPS.flatMap(g => g.items as readonly { to: string; label: string }[]).find(i => i.to === to)?.label
  ?? NAV.find(i => i.to === to)?.label ?? "Overview";

/** Connected tab bar shown on a flow page and its subpages for quick jumping between them. */
export function FlowSubpageTabs() {
  const { pathname } = useLocation();
  const family = findSubpageFamily(pathname);
  if (!family) return null;
  const tabs = [{ to: family.parent, label: labelFor(family.parent) }, ...family.pages];
  return (
    <nav aria-label="Related pages" className="-mx-1 mb-4 overflow-x-auto px-1">
      <div className="flex w-max gap-1.5">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) => cn(
              "min-h-9 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary/40 bg-primary/15 text-foreground"
                : "border-border/60 bg-card/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
