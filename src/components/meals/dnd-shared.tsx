import { useMemo } from "react";
import {
  KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/** Shared sensor config for pantry DnD: click-safe drag, long-press on touch, keyboard a11y. */
export function usePantrySensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function buzz(ms = 8) {
  try { (navigator as any).vibrate?.(ms); } catch { /* noop */ }
}

export function useStableArray<T>(arr: T[], key: (t: T) => string) {
  return useMemo(() => arr.map(key), [arr, key]);
}