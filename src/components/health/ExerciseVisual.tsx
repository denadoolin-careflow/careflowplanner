import { MOVEMENT_VISUALS, resolveMovementVisual, type MovementVisualKey } from "@/lib/movement-visuals";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "h-5 w-5",
  sm: "h-12 w-12",
  lg: "h-40 w-40 sm:h-48 sm:w-48",
};

interface Props {
  /** Explicit visual key — wins over textual resolution. */
  visualKey?: MovementVisualKey;
  /** Free-text hints (title, cue, activity name). Used when visualKey is omitted. */
  hints?: (string | undefined | null)[];
  size?: Size;
  className?: string;
  /** Optional tinted background behind the figure. */
  tint?: string;
  alt?: string;
}

export function ExerciseVisual({ visualKey, hints, size = "sm", className, tint, alt = "" }: Props) {
  const key = visualKey ?? resolveMovementVisual(...(hints ?? []));
  const src = MOVEMENT_VISUALS[key] ?? MOVEMENT_VISUALS.default;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl",
        SIZE_CLASSES[size],
        className,
      )}
      style={tint ? { background: tint } : undefined}
      aria-hidden={alt === ""}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        width={512}
        height={512}
        className="h-full w-full object-contain"
      />
    </div>
  );
}