import { isSameDay } from "date-fns";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PlanHeader } from "@/components/layout/PlanHeader";
import { TODAY_VIEW_LABELS, type TodayView, type TodayPrefs } from "@/lib/today-view";
import { cn } from "@/lib/utils";

/** Single sticky control bar for Today: date, scope, layout and preferences. */
export function TodayHeader({
  date, onDate, view, onView, defaultView, onDefaultView,
  prefs, onPrefs, defaultRoute, onDefaultRoute, onTemplates,
}: {
  date: Date;
  onDate: (d: Date) => void;
  view: TodayView;
  onView: (v: TodayView) => void;
  defaultView: TodayView;
  onDefaultView: (v: TodayView) => void;
  prefs: TodayPrefs;
  onPrefs: (patch: Partial<TodayPrefs>) => void;
  defaultRoute: string;
  onDefaultRoute: (route: string) => void;
  onTemplates: () => void;
}) {
  const isToday = isSameDay(date, new Date());
  return (
    <PlanHeader
      scope="today"
      date={date}
      isCurrent={isToday}
      onPrev={() => onDate(new Date(date.getTime() - 86400000))}
      onNext={() => onDate(new Date(date.getTime() + 86400000))}
      onToday={() => onDate(new Date())}
      onDatePick={onDate}
      views={
        <div
            role="tablist"
            aria-label="Today layout"
            className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]"
          >
            {(Object.keys(TODAY_VIEW_LABELS) as TodayView[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={view === k}
                type="button"
                onClick={() => onView(k)}
                className={cn(
                  "min-h-[32px] rounded-full px-3 transition-colors",
                  view === k ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TODAY_VIEW_LABELS[k]}
              </button>
            ))}
        </div>
      }
      prefs={
        <>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today preferences</div>
              <label className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Try this now from Carey</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">Carey's suggestions at the top of Today.</span>
                </span>
                <Switch checked={prefs.showCareyNudges} onCheckedChange={(v) => onPrefs({ showCareyNudges: v })} />
              </label>
              <label className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Quick add bar</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">Inline input to drop tasks or meals into a slot.</span>
                </span>
                <Switch checked={prefs.showQuickAdd} onCheckedChange={(v) => onPrefs({ showQuickAdd: v })} />
              </label>
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <div className="text-sm font-medium text-foreground">Pin as default page</div>
                <p className="text-[11px] leading-snug text-muted-foreground">Where the app opens after you sign in.</p>
                <div className="inline-flex w-full items-center gap-1 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]">
                  {([
                    { route: "/today", label: "Today" },
                    { route: "/week", label: "Week" },
                    { route: "/month", label: "Month" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.route}
                      type="button"
                      onClick={() => onDefaultRoute(opt.route)}
                      className={cn(
                        "min-h-[32px] flex-1 rounded-full px-2.5 transition-colors",
                        defaultRoute === opt.route ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <div className="text-sm font-medium text-foreground">Pin default Today layout</div>
                <div className="inline-flex w-full items-center gap-1 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]">
                  {(Object.keys(TODAY_VIEW_LABELS) as TodayView[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { onDefaultView(k); onView(k); }}
                      className={cn(
                        "min-h-[32px] flex-1 rounded-full px-2.5 transition-colors",
                        defaultView === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {TODAY_VIEW_LABELS[k]}{defaultView === k ? " · pinned" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 border-t border-border/50 pt-3">
                <div className="text-sm font-medium text-foreground">Board templates</div>
                <p className="text-[11px] leading-snug text-muted-foreground">Start the Board layout from a curated set of cards.</p>
                <Button variant="outline" size="sm" className="w-full rounded-full" onClick={onTemplates}>
                  <LayoutTemplate className="mr-1.5 h-3.5 w-3.5" /> Browse templates
                </Button>
              </div>
        </>
      }
    />
  );
}