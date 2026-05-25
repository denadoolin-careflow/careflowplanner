/**
 * Soft completion chime via WebAudio. Mirrors pomodoro-chime style.
 * Plays a gentle two-note bloom when a task is marked done.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext | undefined =
        (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const PREF_KEY = "careflow:completion-sound";

export function isCompletionSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}
export function setCompletionSoundEnabled(on: boolean) {
  try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch { /* noop */ }
}

function tone(freq: number, start: number, duration: number, gain = 0.10) {
  const ac = getCtx(); if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Play soft completion bloom (E5 -> A5). No-op if user disabled. */
export function playCompletionChime() {
  if (!isCompletionSoundEnabled()) return;
  tone(659.25, 0, 0.35, 0.09);
  tone(880.00, 0.10, 0.50, 0.10);
}
