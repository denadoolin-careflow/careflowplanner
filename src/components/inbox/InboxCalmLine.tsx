import { useEffect, useState } from "react";
import { X, Leaf } from "lucide-react";
import { pickInboxCalmLine } from "@/lib/affirmations";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * A calming line shown above the Inbox on mobile so a full list of tasks
 * reads as a soft landing place rather than mental clutter.
 */
export function InboxCalmLine({ className }: { className?: string }) {
  const isMobile = useIsMobile();
  const [line, setLine] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setLine(pickInboxCalmLine());
    const t = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  if (!isMobile || dismissed || !line) return null;

  return (
    <div
      role="note"
      aria-label="A calming thought"
      className={cn(
        "flex items-start gap-2 rounded-2xl border border-border/50 bg-muted/40 px-3 py-2.5 transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
      <p className="min-w-0 flex-1 font-display text-[13px] leading-snug text-muted-foreground">{line}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss calming thought"
        className="shrink-0 rounded-full p-1 text-muted-foreground/70"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}