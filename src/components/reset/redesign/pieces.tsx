import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles, Plus, ListChecks, Home as HomeIcon, LayoutGrid, Repeat,
  Wind, Flame, Music2, Droplet, Sun, Timer, Mic, ScanLine, ClipboardList,
  Heart, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pickAffirmation } from "@/lib/affirmations";

/* ------------------------------------------------------------------ */
/*  Animated circular progress ring                                    */
/* ------------------------------------------------------------------ */
export function ProgressRing({
  value,
  size = 140,
  stroke = 12,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = c * (1 - pct / 100);
  const reduce = useReducedMotion();
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="hsl(var(--reset-sage-soft))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#reset-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: dash }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 18 }}
        />
        <defs>
          <linearGradient id="reset-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--reset-sage))" />
            <stop offset="100%" stopColor="hsl(var(--reset-gold))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-3xl font-semibold tracking-tight text-[hsl(var(--reset-charcoal))]">
          {Math.round(pct)}%
        </span>
        {label && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[hsl(var(--reset-charcoal))]/60">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="mt-1 text-[10px] text-[hsl(var(--reset-charcoal))]/55">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Segmented view switcher with spring pill                           */
/* ------------------------------------------------------------------ */
export type ResetView = "checklist" | "byRoom" | "routines" | "zones";
const VIEW_OPTIONS: { id: ResetView; label: string; icon: typeof ListChecks }[] = [
  { id: "checklist", label: "Checklist", icon: ListChecks },
  { id: "byRoom",    label: "By Room",   icon: HomeIcon },
  { id: "routines",  label: "Routines",  icon: Repeat },
  { id: "zones",     label: "Zones",     icon: LayoutGrid },
];
export function ViewSwitcher({
  value, onChange,
}: { value: ResetView; onChange: (v: ResetView) => void }) {
  return (
    <div role="tablist" aria-label="Reset view" className="reset-chip inline-flex rounded-full p-1">
      {VIEW_OPTIONS.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className="relative isolate flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
          >
            {active && (
              <motion.span
                layoutId="reset-view-pill"
                className="absolute inset-0 -z-10 rounded-full bg-[hsl(var(--reset-sage))] shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
              />
            )}
            <opt.icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-[hsl(var(--reset-ink))]/70")} />
            <span className={cn(active ? "text-white" : "text-[hsl(var(--reset-ink))]/80")}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Room filter pill                                                   */
/* ------------------------------------------------------------------ */
export function RoomFilterPill({
  label, icon: Icon, active, complete, done, total, onClick,
}: {
  label: string;
  icon: typeof HomeIcon;
  active?: boolean;
  complete?: boolean;
  done?: number;
  total?: number;
  onClick?: () => void;
}) {
  const pct = total ? Math.round((done ?? 0) / total * 100) : 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "reset-chip group flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        "hover:-translate-y-0.5",
        active && "!bg-[hsl(var(--reset-sage))] !border-transparent !text-white",
        complete && !active && "shadow-[0_0_0_2px_hsl(var(--reset-sage)/0.35)]",
      )}
    >
      <span className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full",
        active ? "bg-white/25 text-white" : "bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]",
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>{label}</span>
      {typeof total === "number" && total > 0 && (
        <span className={cn(
          "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-white/25 text-white" : "bg-[hsl(var(--reset-cream-deep))] text-[hsl(var(--reset-ink))]/70",
        )}>
          {done}/{total}
        </span>
      )}
      {typeof total === "number" && total > 0 && (
        <span className="relative ml-0.5 inline-flex h-4 w-4">
          <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90">
            <circle cx="10" cy="10" r="8" stroke={active ? "rgba(255,255,255,0.3)" : "hsl(var(--reset-sage-soft))"} strokeWidth="3" fill="none" />
            <circle
              cx="10" cy="10" r="8"
              stroke={active ? "white" : "hsl(var(--reset-sage))"}
              strokeWidth="3" strokeLinecap="round" fill="none"
              strokeDasharray={2 * Math.PI * 8}
              strokeDashoffset={2 * Math.PI * 8 * (1 - pct / 100)}
            />
          </svg>
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Reset tips carousel                                                */
/* ------------------------------------------------------------------ */
const TIPS = [
  { icon: Wind,    text: "Open a window and let the air move." },
  { icon: Flame,   text: "Light a candle — a small ritual to start." },
  { icon: Music2, text: "Put on calming music you love." },
  { icon: Droplet, text: "Drink a glass of water first." },
  { icon: Sun,     text: "Let natural light in. Even a little helps." },
];
export function TipsCarousel() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI(v => (v + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, [reduce]);
  const Tip = TIPS[i];
  return (
    <div className="reset-glass flex items-center gap-3 overflow-hidden px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--reset-gold-soft))] text-[hsl(var(--reset-gold))]">
        <Tip.icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--reset-ink))]/55">Reset tip</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
            className="whitespace-normal break-words text-sm font-medium text-[hsl(var(--reset-charcoal))]"
          >
            {Tip.text}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1">
        {TIPS.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Tip ${idx + 1}`}
            onClick={() => setI(idx)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              idx === i ? "w-4 bg-[hsl(var(--reset-sage))]" : "w-1.5 bg-[hsl(var(--reset-line))]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Daily intention card                                               */
/* ------------------------------------------------------------------ */
export function IntentionCard() {
  const [text, setText] = useState(() => pickAffirmation());
  return (
    <div className="reset-glass relative overflow-hidden p-5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[hsl(var(--reset-gold-soft))] blur-2xl" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-ink))]/55">
        Daily intention
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="mt-2 font-display text-lg leading-snug text-[hsl(var(--reset-charcoal))]"
        >
          "{text}"
        </motion.p>
      </AnimatePresence>
      <button
        onClick={() => {
          let next = pickAffirmation();
          for (let i = 0; i < 3 && next === text; i++) next = pickAffirmation();
          setText(next);
        }}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--reset-sage))] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5"
      >
        <Sparkles className="h-3.5 w-3.5" /> Generate new
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Smart suggestion card                                              */
/* ------------------------------------------------------------------ */
export function SuggestionCard({ text, onDismiss }: { text: string; onDismiss?: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="reset-chip flex items-start gap-2 rounded-2xl px-3 py-2 text-xs"
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--reset-gold))]" />
      <span className="min-w-0 flex-1 text-[hsl(var(--reset-ink))]/85">{text}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-[hsl(var(--reset-ink))]/40 hover:text-[hsl(var(--reset-ink))]">
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick actions FAB                                                  */
/* ------------------------------------------------------------------ */
export type QuickAction = "task" | "room" | "routine" | "timer" | "voice" | "scan";
const FAB_ACTIONS: { id: QuickAction; label: string; icon: typeof Plus }[] = [
  { id: "task",    label: "Add task",     icon: ClipboardList },
  { id: "room",    label: "Add room",     icon: HomeIcon },
  { id: "routine", label: "New routine",  icon: Repeat },
  { id: "timer",   label: "Start timer",  icon: Timer },
  { id: "voice",   label: "Voice capture", icon: Mic },
  { id: "scan",    label: "Scan room",    icon: ScanLine },
];
export function QuickFab({ onAction }: { onAction: (a: QuickAction) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="reset-glass-strong pointer-events-auto mb-3 flex w-56 flex-col gap-1 p-2"
          >
            {FAB_ACTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => { onAction(a.id); setOpen(false); }}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-[hsl(var(--reset-ink))] transition-colors hover:bg-[hsl(var(--reset-sage-soft))]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--reset-sage-soft))] text-[hsl(var(--reset-sage-deep))]">
                  <a.icon className="h-4 w-4" />
                </span>
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
        className={cn(
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_40px_-12px_hsl(150_30%_20%/0.55)] transition-transform",
          "bg-gradient-to-br from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))]",
          open ? "rotate-45" : "hover:-translate-y-0.5",
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

/* Utility: split heart-favorite (kept here so it stays localised) */
export function TinyHeart({ active }: { active?: boolean }) {
  return <Heart className={cn("h-3.5 w-3.5", active ? "fill-[hsl(var(--reset-gold))] text-[hsl(var(--reset-gold))]" : "text-[hsl(var(--reset-ink))]/30")} />;
}

/* Force imports used only in this file to satisfy tree-shaking hints */
export const __resetIconRefs = { useMemo };