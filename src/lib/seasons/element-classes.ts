import type { ZodiacElement } from "./zodiac-seasons";

/** Static Tailwind classes per element so JIT can see them. */
export const ELEMENT_CLASSES: Record<ZodiacElement, {
  text: string; bg: string; border: string; dot: string; ring: string;
}> = {
  fire: {
    text: "text-element-fire", bg: "bg-element-fire/10", border: "border-element-fire/30",
    dot: "bg-element-fire", ring: "ring-element-fire/40",
  },
  earth: {
    text: "text-element-earth", bg: "bg-element-earth/10", border: "border-element-earth/30",
    dot: "bg-element-earth", ring: "ring-element-earth/40",
  },
  air: {
    text: "text-element-air", bg: "bg-element-air/10", border: "border-element-air/30",
    dot: "bg-element-air", ring: "ring-element-air/40",
  },
  water: {
    text: "text-element-water", bg: "bg-element-water/10", border: "border-element-water/30",
    dot: "bg-element-water", ring: "ring-element-water/40",
  },
};
