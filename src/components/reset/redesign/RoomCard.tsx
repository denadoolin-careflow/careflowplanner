import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Clock, MoreHorizontal, Star, GripVertical,
  Check, Home as HomeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResetChecklist, ResetItem } from "@/lib/reset-checklists";
import { SuggestionCard } from "./pieces";

export function RoomCard({
  list, icon: Icon, tint, onToggle, onOpenAll, onFavorite, favorites, suggestion,
}: {
  list: ResetChecklist;
  icon: typeof HomeIcon;
  tint?: "sage" | "gold" | "cream";
  onToggle: (item: ResetItem, done: boolean) => void;
  onOpenAll: () => void;
  onFavorite?: (id: string) => void;
  favorites?: Record<string, boolean>;
  suggestion?: string;
}) {
  const roots = list.items.filter(i => !i.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const done = roots.filter(i => i.done).length;
  const total = roots.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const est = roots.filter(i => !i.done).reduce((s, i) => s + (i.est_minutes ?? 0), 0);
  const [open, setOpen] = useState(pct > 0 && pct < 100);
  const complete = total > 0 && done === total;

  return (
    <motion.article
      layout
      animate={{ scale: complete ? 0.985 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={cn(
        "reset-glass overflow-hidden",
        complete && "opacity-90",
      )}
    >
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          "bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]",
          tint === "gold" && "bg-[hsl(var(--reset-gold-soft))] text-[hsl(var(--reset-gold))]",
          tint === "cream" && "bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]",
        )}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold text-[hsl(var(--reset-charcoal))]">
              {list.name}
            </h3>
            {complete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--reset-sage))] px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Check className="h-3 w-3" /> Done
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-[hsl(var(--reset-ink))]/60">
            <span className="tabular-nums">{done}/{total || 0} tasks</span>
            {est > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="h-3 w-3" /> {est}m
                </span>
              </>
            )}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--reset-sage-soft))]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>
        </div>
        <span className={cn(
          "ml-1 flex h-8 w-8 items-center justify-center rounded-full text-[hsl(var(--reset-ink))]/60 transition-transform",
          open && "rotate-180",
        )}>
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[hsl(var(--reset-line))]/60 px-2 pb-3 pt-2">
              <ul className="space-y-0.5">
                {roots.map(item => (
                  <TaskRow
                    key={item.id}
                    item={item}
                    onToggle={(d) => onToggle(item, d)}
                    onFavorite={onFavorite}
                    favorite={favorites?.[item.id]}
                  />
                ))}
                {roots.length === 0 && (
                  <li className="rounded-xl border border-dashed border-[hsl(var(--reset-line))] p-3 text-center text-xs text-[hsl(var(--reset-ink))]/50">
                    No tasks yet — tap "View all" to add some.
                  </li>
                )}
              </ul>
              {suggestion && (
                <div className="mt-3 px-2">
                  <SuggestionCard text={suggestion} />
                </div>
              )}
              <div className="mt-3 flex justify-end px-2">
                <button
                  onClick={onOpenAll}
                  className="text-xs font-medium text-[hsl(var(--reset-sage-deep))] hover:underline"
                >
                  View all →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function TaskRow({
  item, onToggle, onFavorite, favorite,
}: {
  item: ResetItem;
  onToggle: (done: boolean) => void;
  onFavorite?: (id: string) => void;
  favorite?: boolean;
}) {
  const [ripple, setRipple] = useState(false);
  return (
    <li className={cn(
      "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
      "hover:bg-[hsl(var(--reset-sage-soft))]/50",
      item.done && "opacity-60",
    )}>
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--reset-ink))]/25 opacity-0 group-hover:opacity-100" />
      <button
        onClick={() => {
          if (!item.done) { setRipple(true); setTimeout(() => setRipple(false), 500); }
          onToggle(!item.done);
        }}
        aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          item.done
            ? "border-[hsl(var(--reset-sage))] bg-[hsl(var(--reset-sage))] text-white"
            : "border-[hsl(var(--reset-ink))]/25 hover:border-[hsl(var(--reset-sage))]",
        )}
      >
        {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
        {ripple && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[hsl(var(--reset-sage))]/40 animate-ping" />
        )}
      </button>
      <span className={cn(
        "min-w-0 flex-1 truncate text-sm text-[hsl(var(--reset-charcoal))]",
        item.done && "line-through decoration-[hsl(var(--reset-sage))]/60",
      )}>
        {item.title}
      </span>
      {item.est_minutes ? (
        <span className="text-[10px] tabular-nums text-[hsl(var(--reset-ink))]/45">
          {item.est_minutes}m
        </span>
      ) : null}
      <button
        onClick={() => onFavorite?.(item.id)}
        aria-label="Favorite"
        className="text-[hsl(var(--reset-ink))]/25 opacity-0 transition-opacity hover:text-[hsl(var(--reset-gold))] group-hover:opacity-100"
      >
        <Star className={cn("h-3.5 w-3.5", favorite && "fill-[hsl(var(--reset-gold))] text-[hsl(var(--reset-gold))] opacity-100")} />
      </button>
      <button
        aria-label="More"
        className="text-[hsl(var(--reset-ink))]/25 opacity-0 transition-opacity hover:text-[hsl(var(--reset-ink))]/70 group-hover:opacity-100"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}