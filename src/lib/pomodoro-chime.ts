/**
 * Soft two-note chime via WebAudio. No external assets.
 * Different intervals for focus-end vs break-end so they feel distinct.
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

function tone(freq: number, start: number, duration: number, gain = 0.12) {
  const ac = getCtx(); if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // gentle envelope: fade in/out so it doesn't click
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Play a chime when a focus or break session ends. */
export function playPomodoroChime(endedMode: "focus" | "break") {
  if (endedMode === "focus") {
    // soft rising third: C5 -> E5 (rest time, gentle)
    tone(523.25, 0, 0.6);
    tone(659.25, 0.22, 0.7);
  } else {
    // soft descending fifth: G5 -> C5 (back to focus)
    tone(783.99, 0, 0.55);
    tone(523.25, 0.2, 0.65);
  }
}
