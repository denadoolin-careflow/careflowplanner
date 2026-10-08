/** Device-local laundry board: loads move Hamper → Washer → Dryer → Fold → Done. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
function writeLocal(loads: LaundryLoad[]) {
  localStorage.setItem(KEY, JSON.stringify(loads));
  window.dispatchEvent(new Event(EVT));
}
let pushTimer: ReturnType<typeof setTimeout> | undefined;
export function writeLoads(loads: LaundryLoad[]) {
  writeLocal(loads);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await (supabase as any).from("laundry_state").upsert(
      { user_id: session.user.id, loads: readLoads(), updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  }, 400);
}
export function updateLoad(id: string, patch: Partial<LaundryLoad>) {
  writeLoads(readLoads().map(l => (l.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l)));
}

/** Account sync: pull on start, merge legacy local loads, live updates from other devices. */
let syncStarted = false;
export async function startLaundrySync() {
  if (syncStarted) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  syncStarted = true;
  const uid = session.user.id;
  const { data } = await (supabase as any).from("laundry_state").select("loads").eq("user_id", uid).maybeSingle();
  const remote: LaundryLoad[] = (data?.loads as LaundryLoad[]) ?? [];
  const local = readLoads();
  const byId = new Map<string, LaundryLoad>();
  for (const l of [...remote, ...local]) {
    const prev = byId.get(l.id);
    if (!prev || l.updatedAt > prev.updatedAt) byId.set(l.id, l);
  }
  const merged = [...byId.values()];
  if (!data || merged.length !== remote.length || local.some(l => byId.get(l.id) === l && !remote.find(r => r.id === l.id && r.updatedAt === l.updatedAt))) {
    writeLoads(merged);
  } else writeLocal(merged);
  supabase
    .channel(`laundry-${uid}`)
    .on("postgres_changes" as any, { event: "*", schema: "public", table: "laundry_state", filter: `user_id=eq.${uid}` },
      (p: any) => { if (p.new?.loads) writeLocal(p.new.loads); })
    .subscribe();
}

export function useLaundry(): LaundryLoad[] {
  const [loads, setLoads] = useState(readLoads);
  useEffect(() => {
    void startLaundrySync();
    const on = () => setLoads(readLoads());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener("storage", on); };
  }, []);
  return loads;
}

export const DEFAULT_MINUTES: Partial<Record<LaundryStage, number>> = { washer: 45, dryer: 60 };
