import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Shared animated chip row for priorities / top-three style lists. */
export function ChipList({
  items, onRemove, emptyLabel = "None yet.",
}: { items: string[]; onRemove?: (i: number) => void; emptyLabel?: string }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      <AnimatePresence>
        {items.map((s, i) => (
          <motion.span
            key={`${s}-${i}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="group inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {s}
            {onRemove && (
              <button onClick={() => onRemove(i)} className="opacity-50 hover:opacity-100" aria-label={`Remove ${s}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}