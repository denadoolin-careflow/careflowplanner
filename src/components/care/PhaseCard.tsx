import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  to: string;
  letter: string;
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  iconTint: string;
  delay?: number;
}

export function PhaseCard({ to, letter, title, tagline, description, icon: Icon, tint, iconTint, delay = 0 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <Link
        to={to}
        className={cn(
          "group relative block overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-5 backdrop-blur-sm transition-all",
          "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_48px_-24px_hsl(var(--primary)/0.35)]",
        )}
      >
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-70", tint)}
        />
        <div className="flex items-start gap-3">
          <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", iconTint)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {letter} · {tagline}
            </p>
            <h3 className="font-display text-xl font-semibold leading-tight">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
