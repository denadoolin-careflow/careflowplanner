import { useEffect, useState } from "react";
import { Brain, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Listens for "pomodoro:boundary" custom events and shows a brief, gentle
 * full-screen wash to mark the transition. Auto-dismisses after ~2.4s.
 */
export interface PomodoroBoundaryDetail {
  endedMode: "focus" | "break";
}

export function PomodoroBoundaryFlash() {
  const [active, setActive] = useState<PomodoroBoundaryDetail | null>(null);

  useEffect(() => {
    const onBoundary = (e: Event) => {
      const detail = (e as CustomEvent<PomodoroBoundaryDetail>).detail;
      if (!detail) return;
      setActive(detail);
      const t = window.setTimeout(() => setActive(null), 2400);
      return () => window.clearTimeout(t);
    };
    window.addEventListener("pomodoro:boundary", onBoundary as EventListener);
    return () => window.removeEventListener("pomodoro:boundary", onBoundary as EventListener);
  }, []);

  if (!active) return null;
  const isFocusEnd = active.endedMode === "focus";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center animate-fade-in"
      aria-hidden
    >
      {/* Soft color wash */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          isFocusEnd
            ? "bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_70%)]"
            : "bg-[radial-gradient(ellipse_at_center,hsl(var(--accent)/0.22),transparent_70%)]",
        )}
      />
      {/* Centered chip */}
      <div
        className={cn(
          "relative animate-scale-in rounded-full border border-border/60 bg-card/95 px-5 py-3 shadow-xl backdrop-blur",
          "flex items-center gap-2 text-sm",
        )}
      >
        {isFocusEnd ? (
          <>
            <Coffee className="h-4 w-4 text-primary" />
            <span className="font-medium">Break time</span>
            <span className="text-muted-foreground">— breathe softly.</span>
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-medium">Focus time</span>
            <span className="text-muted-foreground">— ready when you are.</span>
          </>
        )}
      </div>
    </div>
  );
}
