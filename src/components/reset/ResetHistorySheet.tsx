import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useResetHistory } from "@/lib/reset-history";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { Check, Clock, History } from "lucide-react";
import { useMemo } from "react";

function fmtDay(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

export function ResetHistorySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { rows, loading } = useResetHistory(7);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = r.completed_at.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [rows]);

  const total = rows.length;
  const minutes = Math.round(rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / 60);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-2xl">
            <History className="h-5 w-5" /> Reset history
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-100/70 to-emerald-50/40 p-3 ring-1 ring-emerald-200/60">
            <p className="text-[10px] uppercase tracking-wider text-foreground/60">Last 7 days</p>
            <p className="font-display text-2xl font-semibold">{total}</p>
            <p className="text-[11px] text-muted-foreground">small things done</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-100/70 to-amber-50/40 p-3 ring-1 ring-amber-200/60">
            <p className="text-[10px] uppercase tracking-wider text-foreground/60">Focused</p>
            <p className="font-display text-2xl font-semibold">{minutes}m</p>
            <p className="text-[11px] text-muted-foreground">spent resetting</p>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nothing logged yet. Complete a reset task and it will appear here.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {grouped.map(([day, items]) => (
              <section key={day}>
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {fmtDay(items[0].completed_at)}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 rounded-xl bg-card/70 px-3 py-2 ring-1 ring-border/40">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate text-sm">{r.title}</span>
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(r.completed_at), "h:mma").toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}