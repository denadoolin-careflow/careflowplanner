/**
 * Per-day self-reported energy (low/medium/high), backed by localStorage.
 * Mirrors the Lunar Life Home pattern but keyed per ISO date so it resets
 * automatically each day.
 */
import { useEffect, useState } from "react";

export type Energy = "low" | "medium" | "high";
const KEY = "careflow:energy:by-date";
const EVENT = "careflow:energy:change";

function readAll(): Record<string, Energy> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

function writeAll(map: Record<string, Energy>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT));
}

export function getEnergyFor(dateISO: string): Energy | null {
  return readAll()[dateISO] ?? null;
}

export function setEnergyFor(dateISO: string, e: Energy) {
  const map = readAll();
  map[dateISO] = e;
  writeAll(map);
}

export function useDayEnergy(dateISO: string): [Energy, (e: Energy) => void] {
  const [energy, setEnergy] = useState<Energy>(() => getEnergyFor(dateISO) ?? "medium");
  useEffect(() => {
    setEnergy(getEnergyFor(dateISO) ?? "medium");
    const h = () => setEnergy(getEnergyFor(dateISO) ?? "medium");
    window.addEventListener(EVENT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVENT, h);
      window.removeEventListener("storage", h);
    };
  }, [dateISO]);
  return [
    energy,
    (e) => { setEnergyFor(dateISO, e); setEnergy(e); },
  ];
}

export const ENERGY_RANK: Record<Energy, number> = { low: 1, medium: 2, high: 3 };