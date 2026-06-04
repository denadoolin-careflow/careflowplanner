import { cn } from "@/lib/utils";
import icon from "@/assets/careflow-app-icon.png.asset.json";

type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

/**
 * CareFlow brand mark — the sage-green app icon, wrapped in a cream
 * backplate so it always reads on light backgrounds, dark backgrounds,
 * and dark-green CTA fills without losing contrast with its own sage tile.
 */
export function CareFlowMark({
  size = 36,
  className,
  rounded = "xl",
  decorative = true,
}: {
  size?: number;
  className?: string;
  rounded?: Rounded;
  decorative?: boolean;
}) {
  // Inner image is inset slightly so the cream plate frames the sage tile.
  const pad = Math.max(1, Math.round(size * 0.06));
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "CareFlow"}
      aria-hidden={decorative || undefined}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden bg-[hsl(36_50%_96%)] shadow-sm ring-1 ring-[hsl(36_25%_82%)]",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size, padding: pad }}
    >
      <img
        src={icon.url}
        alt=""
        draggable={false}
        className={cn("h-full w-full select-none object-cover", roundedMap[rounded])}
      />
    </span>
  );
}