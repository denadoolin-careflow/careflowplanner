import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small "What this means today" note shown beside astrology terms. */
export function PlainMeaning({ children, className, label = "What this means today" }: {
  children: React.ReactNode; className?: string; label?: string;
}) {
  return (
    <div className={cn("mt-2 flex gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[13px] text-foreground", className)}>
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <p><span className="font-semibold">{label}: </span>{children}</p>
    </div>
  );
}
