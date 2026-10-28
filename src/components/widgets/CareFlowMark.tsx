import { cn } from "@/lib/utils";
import medallion from "@/assets/brand/careflow-medallion.png.asset.json";

type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-[22%]",
};

/**
 * CareFlow brand mark — the supplied four-phase medallion, shared
 * consistently across atmospheres and dark mode.
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
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "CareFlow"}
      aria-hidden={decorative || undefined}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden bg-card",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={medallion.url}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="block h-full w-full select-none object-contain"
      />
    </span>
  );
}