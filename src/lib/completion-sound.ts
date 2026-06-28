/**
 * Atmosphere-aware completion chimes via WebAudio.
 * Each atmosphere has its own short note sequence so completion
 * feedback feels tailored to the active mood.
 */
import { getCurrentAtmosphere, type AtmosphereId } from "@/lib/atmospheres";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext | undefined =
        (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = getChimeVolume();
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Mobile browsers (iOS Safari especially) require a user-gesture to start
 * the AudioContext, and may suspend it again when the tab is backgrounded
 * or the device locks. We attach a one-time gesture listener that primes
 * the context with a silent buffer so later programmatic plays work, and
 * re-resume on visibility changes.
 */
let unlockBound = false;
export function ensureAudioUnlocked() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    const ac = getCtx();
    if (!ac) return;
    try {
      // Play an inaudible buffer to satisfy iOS gesture requirement.
      const buf = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(0);
      void ac.resume();
    } catch { /* noop */ }
  };
  const events = ["pointerdown", "touchstart", "click", "keydown"];
  events.forEach(e => window.addEventListener(e, unlock, { once: true, passive: true, capture: true } as any));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ctx?.state === "suspended") void ctx.resume();
  });
}
if (typeof window !== "undefined") ensureAudioUnlocked();

// ───────────── prefs ─────────────

const PREF_ENABLED = "careflow:completion-sound";
const PREF_VOLUME  = "careflow:completion-sound:volume";
const PREF_OVERRIDES = "careflow:completion-sound:overrides";

export function isCompletionSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF_ENABLED);
    return v === null ? true : v === "1";
  } catch { return true; }
}
export function setCompletionSoundEnabled(on: boolean) {
  try { localStorage.setItem(PREF_ENABLED, on ? "1" : "0"); } catch { /* noop */ }
}

export function getChimeVolume(): number {
  try {
    const v = localStorage.getItem(PREF_VOLUME);
    if (v === null) return 0.8;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.8;
  } catch { return 0.8; }
}
export function setChimeVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(PREF_VOLUME, String(clamped)); } catch { /* */ }
  if (master) master.gain.value = clamped;
}

type OverrideMap = Partial<Record<AtmosphereId, ChimePresetKey>>;
function readOverrides(): OverrideMap {
  try { return JSON.parse(localStorage.getItem(PREF_OVERRIDES) ?? "{}"); } catch { return {}; }
}
function writeOverrides(o: OverrideMap) {
  try { localStorage.setItem(PREF_OVERRIDES, JSON.stringify(o)); } catch { /* */ }
}
export function getChimeOverride(id: AtmosphereId): ChimePresetKey | null {
  return readOverrides()[id] ?? null;
}
export function setChimeOverride(id: AtmosphereId, key: ChimePresetKey | null) {
  const o = readOverrides();
  if (key === null) delete o[id]; else o[id] = key;
  writeOverrides(o);
}

// ───────────── presets ─────────────

export type ChimePresetKey =
  | "sage-bell"
  | "plum-dream"
  | "linen-pad"
  | "coastal-drop"
  | "hearth-warm"
  | "glass-cinema"
  | "dawn-rise"
  | "mist-whisper"
  | "blossom-arp";

type Note = { freq: number; start: number; dur: number; gain?: number; type?: OscillatorType; detune?: number };

export interface ChimePreset {
  key: ChimePresetKey;
  label: string;
  description: string;
  notes: Note[];
}

export const CHIME_PRESETS: Record<ChimePresetKey, ChimePreset> = {
  "sage-bell": {
    key: "sage-bell", label: "Sage Bell", description: "Warm wooden bell.",
    notes: [
      { freq: 523.25, start: 0,    dur: 0.55, gain: 0.10, type: "triangle" },
      { freq: 783.99, start: 0.13, dur: 0.65, gain: 0.09, type: "triangle" },
    ],
  },
  "plum-dream": {
    key: "plum-dream", label: "Plum Dream", description: "Dreamy 5th with long tail.",
    notes: [
      { freq: 440.00, start: 0,    dur: 0.6,  gain: 0.08, type: "sine", detune: -4 },
      { freq: 659.25, start: 0.12, dur: 0.7,  gain: 0.09, type: "sine" },
      { freq: 880.00, start: 0.24, dur: 0.9,  gain: 0.08, type: "sine", detune: 4 },
    ],
  },
  "linen-pad": {
    key: "linen-pad", label: "Linen Pad", description: "Single soft pad note.",
    notes: [
      { freq: 698.46, start: 0, dur: 0.9, gain: 0.06, type: "sine" },
    ],
  },
  "coastal-drop": {
    key: "coastal-drop", label: "Coastal Drop", description: "Quick water-drop pair.",
    notes: [
      { freq: 587.33, start: 0,    dur: 0.32, gain: 0.10, type: "sine" },
      { freq: 880.00, start: 0.09, dur: 0.45, gain: 0.10, type: "sine" },
    ],
  },
  "hearth-warm": {
    key: "hearth-warm", label: "Hearth Warm", description: "Cozy major third.",
    notes: [
      { freq: 659.25, start: 0,    dur: 0.55, gain: 0.10, type: "triangle" },
      { freq: 830.61, start: 0.10, dur: 0.55, gain: 0.10, type: "triangle" },
      { freq: 987.77, start: 0.20, dur: 0.7,  gain: 0.09, type: "triangle" },
    ],
  },
  "glass-cinema": {
    key: "glass-cinema", label: "Glass Cinema", description: "Cinematic low chime.",
    notes: [
      { freq: 261.63, start: 0,    dur: 0.8,  gain: 0.10, type: "sine" },
      { freq: 392.00, start: 0.16, dur: 0.9,  gain: 0.08, type: "sine" },
      { freq: 130.81, start: 0,    dur: 1.0,  gain: 0.05, type: "sine" },
    ],
  },
  "dawn-rise": {
    key: "dawn-rise", label: "Dawn Rise", description: "Bright rising arpeggio.",
    notes: [
      { freq: 783.99, start: 0,    dur: 0.35, gain: 0.09, type: "sine" },
      { freq: 987.77, start: 0.10, dur: 0.40, gain: 0.09, type: "sine" },
      { freq: 1174.66,start: 0.20, dur: 0.55, gain: 0.10, type: "sine" },
    ],
  },
  "mist-whisper": {
    key: "mist-whisper", label: "Mist Whisper", description: "Barely-there note.",
    notes: [
      { freq: 659.25, start: 0, dur: 1.1, gain: 0.04, type: "sine" },
    ],
  },
  "blossom-arp": {
    key: "blossom-arp", label: "Blossom Arp", description: "Playful arpeggio.",
    notes: [
      { freq: 698.46, start: 0,    dur: 0.28, gain: 0.09, type: "triangle" },
      { freq: 880.00, start: 0.09, dur: 0.30, gain: 0.09, type: "triangle" },
      { freq: 1046.50,start: 0.18, dur: 0.45, gain: 0.10, type: "triangle" },
    ],
  },
};

export const CHIME_PRESET_LIST: ChimePreset[] = Object.values(CHIME_PRESETS);

/** Default chime per atmosphere. */
export const ATMOSPHERE_DEFAULT_CHIME: Record<AtmosphereId, ChimePresetKey> = {
  "sage-sanctuary": "sage-bell",
  "moonlit-plum":   "plum-dream",
  "soft-linen":     "linen-pad",
  "coastal-calm":   "coastal-drop",
  "golden-hearth":  "hearth-warm",
  "dark-sage-glass":"glass-cinema",
  "dawn":           "dawn-rise",
  "mist":           "mist-whisper",
  "blossom":        "blossom-arp",
  "peony-bloom":    "blossom-arp",
  "wisteria-drift": "plum-dream",
  "hibiscus-coast": "coastal-drop",
  "cherry-mist":      "blossom-arp",
  "meadow-dew":       "sage-bell",
  "lilac-rain":       "mist-whisper",
  "harvest-ember":    "hearth-warm",
  "amber-orchard":    "hearth-warm",
  "foggy-pine":       "glass-cinema",
  "snowfall-hush":    "mist-whisper",
  "evergreen-hearth": "hearth-warm",
  "frosted-plum":     "plum-dream",
};

export function resolveChimeFor(id: AtmosphereId): ChimePreset {
  const override = getChimeOverride(id);
  const key = override ?? ATMOSPHERE_DEFAULT_CHIME[id] ?? "sage-bell";
  return CHIME_PRESETS[key] ?? CHIME_PRESETS["sage-bell"];
}

// ───────────── playback ─────────────

function playNote(n: Note) {
  const ac = getCtx(); if (!ac || !master) return;
  // Resume if suspended (mobile background / autoplay gating).
  if (ac.state === "suspended") { try { void ac.resume(); } catch { /* */ } }
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.value = n.freq;
  if (n.detune) osc.detune.value = n.detune;
  const t0 = ac.currentTime + n.start;
  const peak = n.gain ?? 0.09;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + n.dur + 0.05);
}

function playPreset(preset: ChimePreset) {
  preset.notes.forEach(playNote);
}

/** Play the chime tailored to the currently-active atmosphere. */
export function playCompletionChime() {
  if (!isCompletionSoundEnabled()) return;
  playPreset(resolveChimeFor(getCurrentAtmosphere()));
}

/** Preview a specific atmosphere's chime (ignores the global enabled toggle). */
export function playChimeFor(id: AtmosphereId) {
  playPreset(resolveChimeFor(id));
}

/** Preview an arbitrary preset by key. */
export function playChimePreset(key: ChimePresetKey) {
  const p = CHIME_PRESETS[key]; if (p) playPreset(p);
}
