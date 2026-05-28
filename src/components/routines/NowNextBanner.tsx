import { useEffect, useState } from "react";
import { Bell, Play } from "lucide-react";
import { computeNowNext, formatTime12, SLOT_LABEL, type Routine } from "@/lib/routines";
import { Button } from "@/components/ui/button";

export function NowNextBanner({
  routines,
  onFocus,
}: {
  routines: Routine[];
  onFocus?: (r: Routine, itemId: string) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { current, next, upcoming } = computeNowNext(routines, now);

  if (!current && !next && !upcoming) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 p-4 shadow-sm">
      {upcoming && !current && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <Bell className="h-3.5 w-3.5" />
          <span>
            <span className="font-medium">{upcoming.routine.person_name}</span>'s{" "}
            {SLOT_LABEL[upcoming.routine.slot].toLowerCase()} starts in {upcoming.prepInMin} min · get ready
          </span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Now</div>
          {current ? (
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-2xl shadow-sm">
                {current.item.icon || "✨"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">{current.item.text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {current.routine.person_name} · until {formatTime12(`${current.endsAt.getHours()}:${String(current.endsAt.getMinutes()).padStart(2,"0")}`)}
                </div>
              </div>
              {onFocus && (
                <Button size="sm" variant="default" className="h-8 rounded-full px-3 text-xs" onClick={() => onFocus(current.routine, current.item.id)}>
                  <Play className="mr-1 h-3 w-3" /> Focus
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">Nothing in progress</p>
          )}
        </div>
        <div className="sm:border-l sm:border-border/40 sm:pl-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Next</div>
          {next ? (
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-xl">
                {next.item.icon || "•"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{next.item.text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {next.routine.person_name} · {formatTime12(`${next.startsAt.getHours()}:${String(next.startsAt.getMinutes()).padStart(2,"0")}`)}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm italic text-muted-foreground">Free for now</p>
          )}
        </div>
      </div>
    </div>
  );
}