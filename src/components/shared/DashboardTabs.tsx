import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Shared segmented control that swaps between the Dashboard overview and the
 * Projects hub. Uses React Router client-side navigation so switching never
 * triggers a full page reload.
 */
export function DashboardTabs({ className }: { className?: string }) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-1 ring-1 ring-black/5",
        className,
      )}
      style={{ background: "var(--brand-cream-2)" }}
    >
      {[
        { to: "/dashboard", label: "Dashboard" },
        { to: "/projects", label: "Projects" },
      ].map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end
          role="tab"
          className={({ isActive }) =>
            cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              "font-display",
              isActive
                ? "text-white shadow-[0_4px_14px_-6px_rgba(43,31,56,0.5)]"
                : "text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)]",
            )
          }
          style={({ isActive }: { isActive: boolean }) =>
            isActive ? { background: "var(--gradient-brand-plum)" } : undefined
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}