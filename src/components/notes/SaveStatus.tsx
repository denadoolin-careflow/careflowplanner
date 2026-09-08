import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";

/** Small, always-honest autosave indicator shared by every note surface. */
export function SaveStatus({
  state,
  className,
  onRetry,
}: {
  state: SaveState;
  className?: string;
  onRetry?: () => void;
}) {
  const map: Record<SaveState, { label: string; icon: JSX.Element | null; tone: string }> = {
    idle: { label: "Saved", icon: <Check className="h-3 w-3" />, tone: "text-muted-foreground opacity-60" },
    dirty: { label: "Unsaved changes", icon: <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />, tone: "bg-amber-500/10 text-amber-700" },
    saving: { label: "Saving…", icon: <Loader2 className="h-3 w-3 animate-spin" />, tone: "bg-amber-500/10 text-amber-700" },
    saved: { label: "Saved", icon: <Check className="h-3 w-3" />, tone: "bg-emerald-500/10 text-emerald-700" },
    error: { label: "Couldn't save — kept a local copy", icon: <TriangleAlert className="h-3 w-3" />, tone: "bg-destructive/10 text-destructive" },
    offline: { label: "Offline — saved on this device", icon: <CloudOff className="h-3 w-3" />, tone: "bg-muted text-muted-foreground" },
  };
  const s = map[state];

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex max-w-[60vw] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-medium transition-all",
        s.tone,
        className,
      )}
    >
      {s.icon}
      <span className="truncate">{s.label}</span>
      {(state === "error" || state === "offline") && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 underline underline-offset-2">
          Retry
        </button>
      )}
    </span>
  );
}
