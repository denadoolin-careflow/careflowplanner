import careyAvatarSrc from "@/assets/carey-icon-sage.png";
import { cn } from "@/lib/utils";
import { useFlowAccent } from "@/lib/flow-accent";
import { useEffect, useRef, useState } from "react";

// Smoothly interpolate between two #rrggbb[aa] hex colors.
function parseHex(hex: string): [number, number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const a = v.length >= 8 ? parseInt(v.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}
function toHex(r: number, g: number, b: number, a: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${h(a)}`;
}
function lerpHex(from: string, to: string, t: number): string {
  const [r1, g1, b1, a1] = parseHex(from);
  const [r2, g2, b2, a2] = parseHex(to);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t, a1 + (a2 - a1) * t);
}

function useSmoothAccent(target: { color: string; soft: string; ring: string; gradient: string }, duration = 700) {
  const [current, setCurrent] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(target);

  useEffect(() => {
    // Skip animation if values unchanged.
    if (
      target.color === targetRef.current.color &&
      target.soft === targetRef.current.soft &&
      target.ring === targetRef.current.ring &&
      target.gradient === targetRef.current.gradient
    ) {
      return;
    }
    fromRef.current = current;
    targetRef.current = target;
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCurrent(target);
      return;
    }

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // easeInOutCubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setCurrent({
        color: lerpHex(fromRef.current.color, target.color, eased),
        soft: lerpHex(fromRef.current.soft, target.soft, eased),
        ring: lerpHex(fromRef.current.ring, target.ring, eased),
        gradient: lerpHex(fromRef.current.gradient, target.gradient, eased),
      });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.color, target.soft, target.ring, target.gradient, duration]);

  return current;
}

type CareyAvatarProps = {
  size?: number;
  className?: string;
  /** Disable the atmosphere-tinted halo (useful on busy backgrounds). */
  flat?: boolean;
};

export function CareyAvatar({ size = 28, className, flat = false }: CareyAvatarProps) {
  const rawAccent = useFlowAccent("careflow");
  const accent = useSmoothAccent(rawAccent);
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
        "relative inline-flex items-center justify-center rounded-full",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 40%, ${accent.soft}, transparent 70%)`,
        boxShadow: `0 0 0 1px ${accent.ring} inset, 0 6px 18px -6px ${accent.gradient}, 0 0 0 1px hsl(var(--background) / 0.4) inset`,
      }}
    >
      <img
        src={careyAvatarSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        className="object-contain pointer-events-none select-none"
        style={{
          width: iconSize,
          height: iconSize,
          // Subtle atmosphere-aware tint via colored drop shadow. The base
          // drop-shadow keeps the sprout legible on both light and dark
          // surfaces; the colored glow inherits the active atmosphere.
          filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.18)) drop-shadow(0 0 6px ${accent.gradient}) drop-shadow(0 0 10px ${accent.soft})`,
        }}
      />
    </span>
  );
}