import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type PlanAccent = "calm" | "warm" | "sage" | "rose";

/** Shared accent-stripe card used by the Day, Week and Month planning dashboards. */
export function PlanCard({
  title, icon: Icon, accent = "calm", action, children, className,
}: {
  title: string;
  icon: any;
  accent?: PlanAccent;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const stripe =
    accent === "calm" ? "from-primary/30 to-primary/0"
    : accent === "warm" ? "from-accent/40 to-accent/0"
    : accent === "sage" ? "from-secondary/40 to-secondary/0"
    : "from-rose-300/40 to-rose-200/0";
  const iconBg =
    accent === "calm" ? "bg-primary/10 text-primary"
    : accent === "warm" ? "bg-accent/30 text-accent-foreground"
    : accent === "sage" ? "bg-secondary/30 text-secondary-foreground"
    : "bg-rose-100 text-rose-700";
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("cozy-card cozy-card-hover relative overflow-hidden", className)}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b", stripe)} />
      <header className="relative flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", iconBg)}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
        </div>
        {action}
      </header>
      <div className="relative px-5 pb-5 pt-3 text-sm">{children}</div>
    </motion.section>
  );
}