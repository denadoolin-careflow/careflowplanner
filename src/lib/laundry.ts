/** Device-local laundry board: loads move Hamper → Washer → Dryer → Fold → Done. */
import { useEffect, useState } from "react";

export type LaundryStage = "hamper" | "washer" | "dryer" | "fold" | "done";
export const STAGES: { id: LaundryStage; label: string; emoji: string }[] = [
  { id: "hamper", label: "Hamper", emoji: "🧺" },
  { id: "washer", label: "Washer", emoji: "🫧" },
  { id: "dryer", label: "Dryer", emoji: "🌀" },
  { id: "fold", label: "Fold & put away", emoji: "👕" },
  { id: "done", label: "Done", emoji: "✨" },
];

export interface LaundryLoad {
  id: string;
  owner: string;
  note?: string;
  stage: LaundryStage;
  /** Epoch ms when the current washer/dryer timer ends. */
  endsAt?: number;
  minutes?: number;
  notified?: boolean;
  taskId?: string;
  updatedAt: number;
}

const KEY = "careflow:laundry:v1";
const EVT = "careflow:laundry-changed";

export function readLoads(): LaundryLoad[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function writeLoads(loads: LaundryLoad[]) {
  localStorage.setItem(KEY, JSON.stringify(loads));
  window.dispatchEvent(new Event(EVT));
}
export function updateLoad(id: string, patch: Partial<LaundryLoad>) {
  writeLoads(readLoads().map(l => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l)));
}

export function useLaundry(): LaundryLoad[] {
  const [loads, setLoads] = useState(readLoads);
  useEffect(() => {
    const on = () => setLoads(readLoads());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
  }, []);
  return loads;
}

export const DEFAULT_MINUTES: Partial<Record<LaundryStage, number>> = { washer: 45, dryer: 60 };
