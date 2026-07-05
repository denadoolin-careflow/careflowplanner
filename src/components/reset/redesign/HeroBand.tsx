import { motion } from "framer-motion";
import { ArrowRight, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/reset-hero.jpg";

export function HeroBand({
  onStart, onContinue, onResetAll, canContinue,
}: {
  onStart: () => void;
  onContinue: () => void;
  onResetAll: () => void;
  canContinue: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 90, damping: 20 }}
      className="reset-glass-strong relative overflow-hidden"
    >
      {/* Background image + gradient overlay */}
      <div className="absolute inset-0 -z-10">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          width={1600}
          height={896}
          className="h-full w-full object-cover opacity-70 dark:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[hsl(var(--reset-cream))/0.92] via-[hsl(var(--reset-cream))/0.72] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--reset-cream))/0.55] to-transparent" />
      </div>

      <div className="relative flex min-h-[220px] flex-col items-end justify-between gap-5 p-5 sm:min-h-[260px] sm:p-8">
        <div className="max-w-md text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--reset-sage-deep))]/70">
            Home Reset
          </p>
          <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight text-[hsl(var(--reset-charcoal))] sm:text-3xl">
            A peaceful home starts with one small reset.
          </h2>
          <p className="mt-2 text-sm text-[hsl(var(--reset-ink))]/70">
            Refresh your space. Reset your mind.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStart}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm",
              "bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))]",
              "transition-transform hover:-translate-y-0.5",
            )}
          >
            <Play className="h-3.5 w-3.5" /> Start reset
          </button>
          {canContinue && (
            <button
              onClick={onContinue}
              className="reset-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onResetAll}
            className="reset-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-[hsl(var(--reset-ink))]/80"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset entire home
          </button>
        </div>
      </div>
    </motion.article>
  );
}