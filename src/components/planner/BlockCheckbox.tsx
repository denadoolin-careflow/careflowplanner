import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Small completion circle used inside timeline blocks. Pops with a haptic
 * pulse and a brief scale animation when a task is checked off.
 */
export function BlockCheckbox({
  done, title, onToggle, className,
}: {
  done: boolean;
  title: string;
  onToggle: () => void;
  className?: string;
}) {
  const [pop, setPop] = useState(false);

  return (
    <button
      type="button"
      aria-label={done ? `Mark ${title} not done` : `Mark ${title} done`}
      aria-pressed={done}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) { haptics.success(); setPop(true); window.setTimeout(() => setPop(false), 260); }
        else haptics.tap();
        onToggle();
      }}
      className={cn(
        "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border-2 transition-transform",
        done ? "border-primary bg-primary text-primary-foreground" : "border-foreground/40 hover:border-primary",
        pop && "scale-125",
        className,
      )}
    >
      {done && <Check className="h-2 w-2" strokeWidth={4} aria-hidden />}
    </button>
  );
}