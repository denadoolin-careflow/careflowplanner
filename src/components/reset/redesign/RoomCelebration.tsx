import { motion, AnimatePresence } from "framer-motion";
import { Leaf, ArrowRight } from "lucide-react";

export function RoomCelebration({
  open, roomName, onContinue, onClose,
}: {
  open: boolean;
  roomName: string;
  onContinue?: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--reset-charcoal))]/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="reset-glass-strong relative w-full max-w-sm overflow-hidden p-6 text-center"
          >
            {/* Floating leaves */}
            <div className="pointer-events-none absolute inset-0">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="reset-leaf absolute text-[hsl(var(--reset-sage))]"
                  style={{
                    left: `${10 + i * 14}%`,
                    bottom: "40%",
                    animationDelay: `${i * 180}ms`,
                  }}
                >
                  <Leaf className="h-4 w-4" />
                </span>
              ))}
            </div>

            {/* Growing plant SVG */}
            <div className="mx-auto flex h-24 w-24 items-end justify-center">
              <svg viewBox="0 0 80 80" className="reset-plant-grow h-full w-full">
                <path d="M40 78 L40 42" stroke="hsl(var(--reset-sage-deep))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M40 55 Q22 48 16 34 Q30 34 40 48 Z" fill="hsl(var(--reset-sage))" opacity="0.85" />
                <path d="M40 45 Q58 40 64 26 Q50 26 40 40 Z" fill="hsl(var(--reset-sage-deep))" opacity="0.85" />
                <circle cx="40" cy="30" r="10" fill="hsl(var(--reset-gold))" opacity="0.5" />
              </svg>
            </div>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--reset-sage-deep))]">
              Room complete
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[hsl(var(--reset-charcoal))]">
              {roomName} complete
            </h3>
            <p className="mt-2 text-sm text-[hsl(var(--reset-ink))]/70">
              You've created a calmer space. Breathe it in.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={onClose}
                className="reset-chip rounded-full px-4 py-2 text-sm font-medium"
              >
                Rest a moment
              </button>
              {onContinue && (
                <button
                  onClick={() => { onContinue(); onClose(); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--reset-sage))] to-[hsl(var(--reset-sage-deep))] px-4 py-2 text-sm font-medium text-white shadow-sm"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}