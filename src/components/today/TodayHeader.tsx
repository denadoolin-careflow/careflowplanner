import { format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Settings2, LayoutTemplate, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { ScopeSegmented } from "@/components/today/dashboard/ScopeSegmented";
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
    <header className="sticky top-0 z-30 -mx-2 mb-1 border-b border-border/40 bg-background/85 px-2 py-2 backdrop-blur-xl sm:-mx-4 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full"
            aria-label="Previous day"
            onClick={() => onDate(new Date(date.getTime() - 86400000))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Pick a date"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2 text-left"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="font-display text-base font-semibold leading-none">
                  {isToday ? "Today" : format(date, "EEE, MMM d")}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={(d) => d && onDate(d)} />
            </PopoverContent>
          </Popover>
          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full"
            aria-label="Next day"
            onClick={() => onDate(new Date(date.getTime() + 86400000))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => onDate(new Date())}>
              Today
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block"><ScopeSegmented active="today" /></div>
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

          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label="Today preferences">
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3">
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
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="mt-2 flex justify-center sm:hidden"><ScopeSegmented active="today" /></div>
    </header>
  );
}