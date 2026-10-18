import { supabase } from "@/integrations/supabase/client";

/** Account sync for tarot pulls + moon ritual checklists; localStorage stays the fast cache. */
export const TAROT_KEY = "careflow.tarot-pulls.v1";
export const MOON_KEY = "careflow.moon-rituals.v1";
const MAX_PULLS = 120;

type Pull = { id: string; createdAt: number };
type Moon = { lowEnergy?: boolean; done?: Record<string, string[]> };

const readLocal = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "") ?? d; } catch { return d; } };

export function mergePulls(a: Pull[], b: Pull[]): Pull[] {
  const map = new Map<string, Pull>();
  [...a, ...b].forEach(p => p?.id && map.set(p.id, p));
  return [...map.values()].sort((x, y) => y.createdAt - x.createdAt).slice(0, MAX_PULLS);
}
export function mergeMoon(a: Moon, b: Moon): Moon {
  const done: Record<string, string[]> = { ...(a.done ?? {}) };
  for (const [k, v] of Object.entries(b.done ?? {})) done[k] = Array.from(new Set([...(done[k] ?? []), ...v]));
  return { lowEnergy: a.lowEnergy ?? b.lowEnergy ?? false, done };
}

async function uid() { const { data } = await supabase.auth.getSession(); return data.session?.user.id ?? null; }

let pulled: Promise<void> | null = null;
/** Fetch account copy once per session, merge with this device, write both back. */
export function syncAstroFromAccount(): Promise<void> {
  pulled ??= (async () => {
    const id = await uid(); if (!id) return;
    const { data } = await (supabase as any).from("astro_suite_state").select("tarot_pulls, moon_rituals").eq("user_id", id).maybeSingle();
    const pulls = mergePulls(readLocal<Pull[]>(TAROT_KEY, []), (data?.tarot_pulls ?? []) as Pull[]);
    const moon = mergeMoon(readLocal<Moon>(MOON_KEY, {}), (data?.moon_rituals ?? {}) as Moon);
    localStorage.setItem(TAROT_KEY, JSON.stringify(pulls));
    localStorage.setItem(MOON_KEY, JSON.stringify(moon));
    window.dispatchEvent(new Event("careflow:tarot-pulls"));
    window.dispatchEvent(new Event("careflow:moon-rituals"));
    await (supabase as any).from("astro_suite_state").upsert({ user_id: id, tarot_pulls: pulls, moon_rituals: moon });
  })().catch(() => { pulled = null; });
  return pulled;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Debounced push of the current device state to the account. */
export function pushAstroToAccount() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const id = await uid(); if (!id) return;
    await (supabase as any).from("astro_suite_state").upsert({
      user_id: id,
      tarot_pulls: readLocal<Pull[]>(TAROT_KEY, []),
      moon_rituals: readLocal<Moon>(MOON_KEY, {}),
    });
  }, 800);
}
