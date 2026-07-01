import { cn } from "@/lib/utils";

type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-[22%]",
};

/**
 * CareFlow brand mark — renders the official 3D yin-yang brand icon
 * (sage + cream) as a rounded plate. The image is baked pixel art,
 * so it stays visually consistent across atmospheres and dark mode.
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
        "relative inline-grid shrink-0 place-items-center overflow-hidden shadow-sm ring-1 ring-border/60",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size, background: "hsl(var(--card))" }}
    >
      <img
        src="/icons/icon-512.png"
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="block h-full w-full select-none object-cover"
      />
    </span>
  );
}