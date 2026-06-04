import { cn } from "@/lib/utils";
import icon from "@/assets/careflow-app-icon.png.asset.json";

type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

/**
 * CareFlow brand mark — the sage-green app icon. Use anywhere the brand
 * lockup needs the full-color logo (landing, auth, waitlist headers/CTAs).
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
  return (
    <img
      src={icon.url}
      alt={decorative ? "" : "CareFlow"}
      aria-hidden={decorative || undefined}
      draggable={false}
      width={size}
      height={size}
      className={cn(
        "inline-block shrink-0 select-none object-cover shadow-sm ring-1 ring-border/40",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}