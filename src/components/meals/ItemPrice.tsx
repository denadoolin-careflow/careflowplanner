import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  QUICK_PRICE_CENTS, fetchPriceHistory, formatMoney, hasCatalogPrice, priceFor, priceTrend,
  type PricePoint,
} from "@/lib/grocery-prices";
import type { Retailer } from "@/lib/retailer-links";
import { RETAILER_LABEL } from "@/lib/retailer-links";
import { format } from "date-fns";

interface Props {
  name: string;
  qty?: string | null;
  store: Retailer;
  overrides: Map<string, number>;
  onSave: (name: string, store: Retailer, cents: number | null) => void;
  className?: string;
  /** Read-only rendering (no tap to edit). */
  readOnly?: boolean;
}

/**
 * Price chip for a grocery item.
 * "~$3.99" = estimate · "$3.99" = a price you set · "Set price" = we don't know this item.
 * Tapping opens a small panel to set the price and see its history.
 */
export function ItemPrice({ name, qty, store, overrides, onSave, className, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<PricePoint[] | null>(null);

  const p = priceFor(name, qty, store, overrides);
  const known = p.exact || hasCatalogPrice(name);

  useEffect(() => {
    if (!open) return;
    setDraft((p.cents / 100).toFixed(2));
    void fetchPriceHistory(name).then(setHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name]);

  const label = p.exact ? formatMoney(p.cents) : known ? `~${formatMoney(p.cents)}` : "Set price";
  const title = p.exact
    ? `Your saved price at ${RETAILER_LABEL[store]}`
    : known
      ? `Estimated at ${RETAILER_LABEL[store]}${p.unit ? ` · per ${p.unit}` : ""} — tap to set the real price`
      : `No price known for this item — tap to choose one`;

  if (readOnly) {
    return (
      <span className={cn("shrink-0 text-[11px] tabular-nums text-muted-foreground", className)}>
        {known ? label : "—"}
      </span>
    );
  }

  const commit = (cents: number | null) => {
    onSave(name, store, cents);
    setOpen(false);
    setHistory(null);
  };

  const commitDraft = () => {
    if (!draft.trim()) { commit(null); return; }
    const n = Number(String(draft).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) { setOpen(false); return; }
    commit(Math.round(n * 100));
  };

  const trend = history ? priceTrend(history) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums transition hover:bg-muted",
            p.exact ? "font-medium text-foreground"
              : known ? "text-muted-foreground"
              : "border border-dashed border-border/70 text-muted-foreground",
            className,
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium">{name}</p>
        <p className="text-[11px] text-muted-foreground">
          {p.exact ? "Your price" : known ? "Estimated" : "No price on file"} at {RETAILER_LABEL[store]}
          {p.unit && !p.exact ? ` · per ${p.unit}` : ""}
        </p>

        {!known && (
          <div className="mt-2">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Pick an estimate</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRICE_CENTS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => commit(c)}
                  className="rounded-full border border-border/60 px-2 py-1 text-[11px] tabular-nums hover:bg-muted"
                >
                  {formatMoney(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">$</span>
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitDraft(); if (e.key === "Escape") setOpen(false); }}
            placeholder="0.00"
            aria-label={`Price for ${name}`}
            className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 text-sm tabular-nums outline-none focus:border-primary"
          />
          <Button size="sm" className="h-8" onClick={commitDraft}>Save</Button>
        </div>

        {p.exact && (
          <button
            type="button"
            onClick={() => commit(null)}
            className="mt-1.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear my price and use the estimate
          </button>
        )}

        <div className="mt-3 border-t border-border/50 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price history</p>
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] tabular-nums",
                trend.changeCents > 0 ? "text-destructive" : trend.changeCents < 0 ? "text-primary" : "text-muted-foreground",
              )}>
                {trend.changeCents > 0 ? <TrendingUp className="h-3 w-3" />
                  : trend.changeCents < 0 ? <TrendingDown className="h-3 w-3" />
                  : <Minus className="h-3 w-3" />}
                {trend.changeCents > 0 ? "+" : ""}{formatMoney(Math.abs(trend.changeCents))} ({trend.pct}%)
              </span>
            )}
          </div>
          {history === null ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">No prices recorded yet. Save one to start tracking.</p>
          ) : (
            <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto">
              {history.map(h => (
                <li key={h.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-muted-foreground">
                    {format(new Date(h.recorded_at), "MMM d")} · {RETAILER_LABEL[h.store as Retailer] ?? h.store}
                  </span>
                  <span className="tabular-nums">{formatMoney(h.price_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
