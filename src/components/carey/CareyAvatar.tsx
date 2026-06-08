import careyAvatarSrc from "@/assets/carey-icon-sage.png";
import { cn } from "@/lib/utils";
import { useFlowAccent } from "@/lib/flow-accent";

type CareyAvatarProps = {
  size?: number;
  className?: string;
  /** Disable the atmosphere-tinted halo (useful on busy backgrounds). */
  flat?: boolean;
};

export function CareyAvatar({ size = 28, className, flat = false }: CareyAvatarProps) {
  const accent = useFlowAccent("careflow");
  // Make the icon itself read larger inside its bounding box.
  const iconScale = 1.18;
  const iconSize = Math.round(size * iconScale);

  if (flat) {
    return (
      <img
        src={careyAvatarSrc}
        alt="Carey"
        width={size}
        height={size}
        className={cn("rounded-full object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden={false}
      role="img"
      aria-label="Carey"
      className={cn(
        "relative inline-flex items-center justify-center rounded-full transition-[background,box-shadow,border-color] duration-500 ease-out",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 45%, ${accent.soft}, transparent 72%)`,
        boxShadow: `0 0 0 1px ${accent.ring} inset, 0 4px 14px -6px ${accent.gradient}`,
      }}
    >
      <img
        src={careyAvatarSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        className="object-contain pointer-events-none select-none transition-[filter] duration-500 ease-out"
        style={{
          width: iconSize,
          height: iconSize,
          // Subtle atmosphere-aware tint via colored drop shadow, keeps sage tones intact.
          filter: `drop-shadow(0 1px 0 ${accent.soft}) drop-shadow(0 0 6px ${accent.gradient})`,
        }}
      />
    </span>
  );
}