import { cn } from "@/lib/utils";
import {
  Sparkles, Building2, Wrench, FileText, StickyNote, ListChecks,
} from "lucide-react";

export type HomeAreasSectionId =
  | "reset" | "zones" | "maintenance" | "documents" | "notes" | "chores";

export const HOME_AREAS_SECTIONS: {
  id: HomeAreasSectionId;
  label: string;
  icon: typeof Sparkles;
}[] = [
  { id: "reset", label: "Reset", icon: Sparkles },
  { id: "zones", label: "Zones", icon: Building2 },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "chores", label: "Chores", icon: ListChecks },
];

interface Props {
  active: HomeAreasSectionId;
  onChange: (id: HomeAreasSectionId) => void;
  /** Optional per-section badge count (urgent items) */
  badges?: Partial<Record<HomeAreasSectionId, { value: number; tone?: "default" | "danger" }>>;
}

/** Persistent left sub-nav on desktop; horizontal scroll pills on mobile. */
export function SectionNav({ active, onChange, badges = {} }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border/60 bg-card/40">
        <div className="p-4">
          <h2 className="mb-4 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Home Areas
          </h2>
          <nav className="space-y-1">
            {HOME_AREAS_SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === active;
              const badge = badges[s.id];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange(s.id)}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "opacity-90" : "opacity-70")} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  {badge && badge.value > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : badge.tone === "danger"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {badge.value}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile pill row */}
      <div className="lg:hidden -mx-2 overflow-x-auto px-2 pb-2">
        <div className="flex gap-2">
          {HOME_AREAS_SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            const badge = badges[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:bg-accent/40",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {badge && badge.value > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      isActive ? "bg-primary-foreground/20" : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {badge.value}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}