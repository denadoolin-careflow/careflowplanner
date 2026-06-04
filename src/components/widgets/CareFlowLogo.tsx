import { cn } from "@/lib/utils";
import logo from "@/assets/careflow-logo.png.asset.json";

type Tint = "primary" | "accent" | "auto";
type Rounded = "md" | "lg" | "xl";

const roundedMap: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

/**
 * CareFlow brand logo. Raster icon retinted to the active theme via
 * `mix-blend-mode: luminosity` over the current --primary token, so it
 * follows light/dark + atmosphere automatically.
 */
export function CareFlowLogo({
  size = 28,
  className,
  tint = "primary",
  rounded = "xl",
}: {
  size?: number;
  className?: string;
  tint?: Tint;
  rounded?: Rounded;
}) {
  const bg =
    tint === "accent"
      ? "hsl(var(--accent, var(--primary)))"
      : "hsl(var(--primary))";
  return (
    <span
      aria-label="CareFlow"
      role="img"
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden ring-1 ring-border/40 shadow-sm",
        roundedMap[rounded],
        className,
      )}
      style={{ width: size, height: size, background: tint === "auto" ? undefined : bg }}
    >
      <img
        src={logo.url}
        alt=""
        draggable={false}
        className="h-full w-full object-cover select-none"
        style={{ mixBlendMode: tint === "auto" ? undefined : "luminosity" }}
      />
    </span>
  );
}