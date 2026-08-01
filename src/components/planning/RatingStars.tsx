import { cn } from "@/lib/utils";

/** Shared 1-5 star rating row. Accent-coloured on every planning page. */
export function RatingStars({
  value, onChange, label,
}: { value: number | null; onChange: (n: number | null) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`Rate ${n}`}
          className={cn(
            "h-7 w-7 rounded-full text-sm transition-all",
            (value ?? 0) >= n ? "bg-accent text-accent-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted",
          )}
        >★</button>
      ))}
    </div>
  );
}