import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatMoney, priceFor } from "@/lib/grocery-prices";
import type { Retailer } from "@/lib/retailer-links";
import { RETAILER_LABEL } from "@/lib/retailer-links";

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

/** Small price chip: "~$3.99" for an estimate, "$3.99" once you've set it yourself. */
export function ItemPrice({ name, qty, store, overrides, onSave, className, readOnly }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const p = priceFor(name, qty, store, overrides);

  const commit = () => {
    const n = Number(String(draft).replace(/[^0-9.]/g, ""));
    setEditing(false);
    if (!draft.trim()) { onSave(name, store, null); return; }
    if (!Number.isFinite(n) || n <= 0) return;
    onSave(name, store, Math.round(n * 100));
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="0.00"
        aria-label={`Price for ${name}`}
        className="h-7 w-16 shrink-0 rounded-md border border-border/60 bg-background px-1.5 text-right text-xs outline-none focus:border-primary"
      />
    );
  }

  const label = `${p.exact ? "" : "~"}${formatMoney(p.cents)}`;
  const title = p.exact
    ? `Your saved price at ${RETAILER_LABEL[store]}`
    : `Estimated at ${RETAILER_LABEL[store]}${p.unit ? ` · per ${p.unit}` : ""} — tap to set the real price`;

  if (readOnly) {
    return <span className={cn("shrink-0 text-[11px] tabular-nums text-muted-foreground", className)}>{label}</span>;
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => { setDraft((p.cents / 100).toFixed(2)); setEditing(true); }}
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums transition hover:bg-muted",
        p.exact ? "font-medium text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {label}
    </button>
  );
}
