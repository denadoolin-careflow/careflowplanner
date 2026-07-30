import { cn } from "@/lib/utils";

export const STEP_LABELS = [
  "How are you arriving today?",
  "Here's what I noticed",
  "Build your day",
  "Close the loop",
];

interface Props {
  step: number;
  onStep?: (step: number) => void;
  maxReached: number;
}

export function CheckInProgress({ step, onStep, maxReached }: Props) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Check-in progress">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const reachable = i <= maxReached;
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onStep?.(i)}
              aria-label={`Step ${i + 1}: ${label}`}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-2.5",
                i !== step && reachable && "bg-primary/35 hover:bg-primary/60",
                !reachable && "bg-muted-foreground/25",
              )}
            />
          );
        })}
      </div>
      <span className="text-[13px] text-muted-foreground">
        Step {step + 1} of {STEP_LABELS.length}
      </span>
    </div>
  );
}