import { cn } from "@/lib/utils";

export function RetrogradeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 px-1 text-[9px] font-semibold leading-none text-destructive",
        "h-3.5 min-w-[14px]",
        className,
      )}
      title="Retrograde"
      aria-label="Retrograde"
    >
      ℞
    </span>
  );
}