import { useMemo } from "react";
import { Link, useLocation, useParams, Navigate } from "react-router-dom";
import { NAV_GROUPS, FLOW_ACCENTS, NAV_DESCRIPTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowRight } from "lucide-react";


export default function FlowLanding() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const group = useMemo(
    () => NAV_GROUPS.find((g) => g.id === id),
    [id],
  );

  if (!group) return <Navigate to="/" replace />;

  const accent = FLOW_ACCENTS[group.id] ?? FLOW_ACCENTS.settings;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
      {/* Header banner */}
      <header
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 md:p-8",
          "bg-gradient-to-br",
          accent.gradient,
          accent.border,
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1",
              accent.bg,
              accent.ring,
            )}
            aria-hidden
          >
            {group.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={cn("text-2xl font-semibold md:text-3xl", accent.text)}>
              {group.label}
            </h1>
            {group.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                {group.subtitle}
              </p>
            )}
          </div>
          {group.items[0] && (
            <Link
              to={group.items[0].to}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                accent.bg,
                accent.text,
                "hover:opacity-80",
              )}
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      {/* Cards grid */}
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/" && location.pathname.startsWith(item.to + "/"));
          const desc = NAV_DESCRIPTIONS[item.to] ?? "";
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-all",
                  "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? cn("ring-2", accent.ring, accent.border)
                    : "border-border hover:border-foreground/20",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg ring-1",
                      accent.bg,
                      accent.ring,
                    )}
                  >
                    <Icon className={cn("h-4 w-4", accent.text)} />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {item.label}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                      isActive && accent.text,
                    )}
                  />
                </div>
                {desc && (
                  <p className="text-xs leading-snug text-muted-foreground">
                    {desc}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}