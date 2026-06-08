import careyAvatarSrc from "@/assets/carey-icon-sage.png";
import { cn } from "@/lib/utils";

export function CareyAvatar({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src={careyAvatarSrc}
      alt="Carey"
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}