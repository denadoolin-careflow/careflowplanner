import { createContext, useContext } from "react";
import type { BurnoutLevel } from "@/lib/burnout-checkin";

export interface CapacityValue {
  level: BurnoutLevel | null;
  multiplier: number;
  /** True when the day should be trimmed to essentials. */
  isLow: boolean;
  /** True when there is room for stretch work. */
  isSpacious: boolean;
}

const Ctx = createContext<CapacityValue>({
  level: null, multiplier: 1, isLow: false, isSpacious: false,
});

export const CapacityProvider = Ctx.Provider;
export const useCapacity = () => useContext(Ctx);

/** How many optional rows a column should show at this capacity. */
export function capacityLimit(base: number, c: CapacityValue): number {
  if (c.level === "depleted") return 1;
  if (c.level === "tender") return Math.max(1, Math.round(base * 0.6));
  if (c.level === "spacious") return base + 2;
  return base;
}