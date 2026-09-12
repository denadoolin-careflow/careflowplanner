/**
 * Tiny WebAudio blips for folding / unfolding note toggles.
 * Fold = soft descending tick, unfold = soft ascending tick.
 * Respects the user's reduced-motion preference and stays quiet.
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
  } catch { return null; }
}

const KEY = "careflow:fold-sound:v1";
export function foldSoundEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}
export function setFoldSoundEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* ignore */ }
}

function blip(from: number, to: number) {
  if (!foldSoundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch { /* ignore */ }
}

export const foldSound = {
  fold: () => blip(620, 380),
  unfold: () => blip(380, 640),
};

/** Animate an element shut (height + opacity) before it's hidden. Resolves when done. */
export function animateCollapse(el: HTMLElement | null | undefined, ms = 180): Promise<void> {
  if (!el || !el.animate || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  const h = el.getBoundingClientRect().height;
  if (!h) return Promise.resolve();
  const prevOverflow = el.style.overflow;
  el.style.overflow = "hidden";
  const anim = el.animate(
    [
      { height: `${h}px`, opacity: 1, transform: "translateY(0)" },
      { height: "0px", opacity: 0, transform: "translateY(-4px)" },
    ],
    { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
  );
  return new Promise(res => {
    anim.onfinish = () => { anim.cancel(); el.style.overflow = prevOverflow; res(); };
    anim.oncancel = () => { el.style.overflow = prevOverflow; res(); };
  });
}
