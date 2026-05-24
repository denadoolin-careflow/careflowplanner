import { AtmosphereId } from "./atmospheres";

export type AtmosphereSuggestion = {
  id: string;
  atmosphere: AtmosphereId;
  message: string;
};

export function getSuggestions(ctx: {
  hour: number;
  lowEnergy?: boolean;
  focus?: boolean;
  moonPhase?: string | null;
  current: AtmosphereId;
}): AtmosphereSuggestion[] {
  const out: AtmosphereSuggestion[] = [];
  if (ctx.lowEnergy && ctx.current !== "mist") {
    out.push({ id: "low-energy-mist", atmosphere: "mist", message: "You seem overloaded today. Try Mist." });
  }
  if (ctx.focus && ctx.current !== "dark-sage-glass") {
    out.push({ id: "focus-dark", atmosphere: "dark-sage-glass", message: "Dark Sage Glass for deep work." });
  }
  if (ctx.hour >= 5 && ctx.hour < 11 && ctx.current !== "dawn") {
    out.push({ id: "morning-dawn", atmosphere: "dawn", message: "Start soft with Dawn." });
  }
  if (ctx.hour >= 19 && ctx.current !== "moonlit-plum") {
    out.push({ id: "evening-plum", atmosphere: "moonlit-plum", message: "Moonlit Plum pairs well with reflection nights." });
  }
  if (ctx.moonPhase && /full/i.test(ctx.moonPhase) && ctx.current !== "moonlit-plum") {
    out.push({ id: "fullmoon-plum", atmosphere: "moonlit-plum", message: "Full moon — try Moonlit Plum." });
  }
  return out;
}

const DISMISS_KEY = "careflow:atmosphere:dismissed";
function todayKey() { return new Date().toISOString().slice(0, 10); }

export function isDismissed(id: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[id] === todayKey();
  } catch { return false; }
}
export function dismiss(id: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = todayKey();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
  } catch { /* */ }
}