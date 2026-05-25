import { useEffect, useState } from "react";
import type { AtmosphereId } from "./atmospheres";

/** A soundscape preset is a small bundle of procedurally generated audio layers
 *  built with the Web Audio API — no assets, no network, no API keys. */
export type SoundscapeId =
  | "rain"
  | "ocean"
  | "stream"
  | "thunder-rain"
  | "fire"
  | "wind"
  | "forest-birds"
  | "night-crickets"
  | "cosmic-drone";

export interface Soundscape {
  id: SoundscapeId;
  label: string;
  hint: string;
  emoji: string;
}

export const SOUNDSCAPES: Soundscape[] = [
  { id: "rain",            label: "Soft rain",      hint: "Gentle rainfall",            emoji: "🌧" },
  { id: "ocean",           label: "Ocean waves",    hint: "Slow rolling surf",          emoji: "🌊" },
  { id: "stream",          label: "Forest stream",  hint: "Flowing water + birds",      emoji: "💧" },
  { id: "thunder-rain",    label: "Distant storm",  hint: "Rain with low rumble",       emoji: "⛈" },
  { id: "fire",            label: "Hearth fire",    hint: "Crackling embers",           emoji: "🔥" },
  { id: "wind",            label: "Warm wind",      hint: "Soft moving air",            emoji: "🌬" },
  { id: "forest-birds",    label: "Morning birds",  hint: "Woodland canopy",            emoji: "🐦" },
  { id: "night-crickets",  label: "Night crickets", hint: "Cool nocturnal hush",        emoji: "🌙" },
  { id: "cosmic-drone",    label: "Cosmic drone",   hint: "Deep meditative pad",        emoji: "✨" },
];

export const ATMOSPHERE_SOUND_MAP: Record<AtmosphereId, SoundscapeId[]> = {
  "sage-sanctuary":   ["forest-birds", "stream", "wind"],
  "moonlit-plum":     ["night-crickets", "cosmic-drone", "rain"],
  "soft-linen":       ["wind", "rain"],
  "coastal-calm":     ["ocean", "wind", "rain"],
  "golden-hearth":    ["fire", "wind"],
  "dark-sage-glass":  ["cosmic-drone", "rain", "night-crickets"],
  "dawn":             ["forest-birds", "fire", "wind"],
  "mist":             ["rain", "stream", "wind"],
  "blossom":          ["forest-birds", "stream"],
};

/* ─────────────── Web Audio engine ─────────────── */

type Layer = { nodes: AudioNode[]; gain: GainNode; stop: () => void };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let active: { id: SoundscapeId; layer: Layer } | null = null;
let fading: { id: SoundscapeId; layer: Layer } | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = readVolume();
    master.connect(ctx.destination);
  }
  return ctx;
}

/* ── generators ── */

function noiseBuffer(c: AudioContext, color: "white" | "pink" | "brown" = "white", seconds = 2): AudioBuffer {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  if (color === "white") {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

function noiseSource(c: AudioContext, color: "white" | "pink" | "brown", seconds = 2): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, color, seconds);
  src.loop = true;
  return src;
}

/** Build a single soundscape layer attached to master. */
function build(id: SoundscapeId): Layer {
  const c = getCtx();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master!);
  const nodes: AudioNode[] = [out];
  const intervals: number[] = [];

  const stop = () => {
    intervals.forEach(clearInterval);
    nodes.forEach((n) => {
      try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* noop */ }
      try { n.disconnect(); } catch { /* noop */ }
    });
  };

  switch (id) {
    case "rain": {
      const src = noiseSource(c, "pink", 3);
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 400;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000;
      src.connect(hp); hp.connect(lp); lp.connect(out); src.start();
      nodes.push(src, hp, lp);
      break;
    }
    case "ocean": {
      const src = noiseSource(c, "brown", 4);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
      const lfoGain = c.createGain(); lfoGain.gain.value = 0.6;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.08; // slow swell
      const sway = c.createGain(); sway.gain.value = 0.5;
      lfo.connect(lfoGain); lfoGain.connect(sway.gain);
      src.connect(lp); lp.connect(sway); sway.connect(out);
      src.start(); lfo.start();
      nodes.push(src, lp, lfo, lfoGain, sway);
      break;
    }
    case "stream": {
      const src = noiseSource(c, "white", 3);
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.7;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3500;
      src.connect(bp); bp.connect(lp); lp.connect(out); src.start();
      nodes.push(src, bp, lp);
      // sparse chirps
      const chirp = () => {
        const osc = c.createOscillator(); osc.type = "sine";
        const g = c.createGain(); g.gain.value = 0;
        const f = 1200 + Math.random() * 1800;
        osc.frequency.setValueAtTime(f, c.currentTime);
        osc.frequency.linearRampToValueAtTime(f + 600, c.currentTime + 0.12);
        g.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.04);
        g.gain.linearRampToValueAtTime(0, c.currentTime + 0.2);
        osc.connect(g); g.connect(out);
        osc.start(); osc.stop(c.currentTime + 0.25);
      };
      intervals.push(window.setInterval(() => Math.random() < 0.5 && chirp(), 2200));
      break;
    }
    case "thunder-rain": {
      const src = noiseSource(c, "pink", 3);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5000;
      src.connect(lp); lp.connect(out); src.start();
      nodes.push(src, lp);
      const rumble = () => {
        const n = noiseSource(c, "brown", 1);
        const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 180;
        const g = c.createGain(); g.gain.value = 0;
        n.connect(f); f.connect(g); g.connect(out);
        const t = c.currentTime;
        g.gain.linearRampToValueAtTime(0.9, t + 0.4);
        g.gain.linearRampToValueAtTime(0, t + 4);
        n.start(t); n.stop(t + 4.2);
      };
      intervals.push(window.setInterval(() => Math.random() < 0.4 && rumble(), 9000));
      break;
    }
    case "fire": {
      const src = noiseSource(c, "pink", 3);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
      const g = c.createGain(); g.gain.value = 0.7;
      src.connect(lp); lp.connect(g); g.connect(out); src.start();
      nodes.push(src, lp, g);
      // crackles
      const crack = () => {
        const n = noiseSource(c, "white", 0.2);
        const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000;
        const cg = c.createGain(); cg.gain.value = 0;
        n.connect(hp); hp.connect(cg); cg.connect(out);
        const t = c.currentTime;
        cg.gain.linearRampToValueAtTime(0.25, t + 0.01);
        cg.gain.linearRampToValueAtTime(0, t + 0.08);
        n.start(t); n.stop(t + 0.1);
      };
      intervals.push(window.setInterval(() => { for (let i = 0; i < 3; i++) Math.random() < 0.6 && crack(); }, 400));
      break;
    }
    case "wind": {
      const src = noiseSource(c, "brown", 4);
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
      const lfoG = c.createGain(); lfoG.gain.value = 400;
      lfo.connect(lfoG); lfoG.connect(lp.frequency);
      src.connect(lp); lp.connect(out); src.start(); lfo.start();
      nodes.push(src, lp, lfo, lfoG);
      break;
    }
    case "forest-birds": {
      const bed = noiseSource(c, "pink", 3);
      const bedLp = c.createBiquadFilter(); bedLp.type = "lowpass"; bedLp.frequency.value = 1200;
      const bedG = c.createGain(); bedG.gain.value = 0.25;
      bed.connect(bedLp); bedLp.connect(bedG); bedG.connect(out); bed.start();
      nodes.push(bed, bedLp, bedG);
      const trill = () => {
        const osc = c.createOscillator(); osc.type = "sine";
        const g = c.createGain(); g.gain.value = 0;
        const base = 1800 + Math.random() * 1600;
        const t = c.currentTime;
        osc.frequency.setValueAtTime(base, t);
        for (let i = 0; i < 4; i++) {
          osc.frequency.linearRampToValueAtTime(base + 800, t + 0.05 + i * 0.1);
          osc.frequency.linearRampToValueAtTime(base, t + 0.1 + i * 0.1);
        }
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.55);
      };
      intervals.push(window.setInterval(() => Math.random() < 0.5 && trill(), 1700));
      break;
    }
    case "night-crickets": {
      const bed = noiseSource(c, "brown", 3);
      const bedLp = c.createBiquadFilter(); bedLp.type = "lowpass"; bedLp.frequency.value = 200;
      const bedG = c.createGain(); bedG.gain.value = 0.35;
      bed.connect(bedLp); bedLp.connect(bedG); bedG.connect(out); bed.start();
      nodes.push(bed, bedLp, bedG);
      const chirp = () => {
        const osc = c.createOscillator(); osc.type = "triangle";
        osc.frequency.value = 4200 + Math.random() * 800;
        const g = c.createGain(); g.gain.value = 0;
        const t = c.currentTime;
        for (let i = 0; i < 5; i++) {
          g.gain.setValueAtTime(0.18, t + i * 0.06);
          g.gain.linearRampToValueAtTime(0, t + 0.04 + i * 0.06);
        }
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.5);
      };
      intervals.push(window.setInterval(() => { for (let i = 0; i < 4; i++) Math.random() < 0.7 && chirp(); }, 900));
      break;
    }
    case "cosmic-drone": {
      const freqs = [110, 165, 220, 277];
      freqs.forEach((f, i) => {
        const osc = c.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0.07 - i * 0.012;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
        const lfoG = c.createGain(); lfoG.gain.value = 0.04;
        lfo.connect(lfoG); lfoG.connect(g.gain);
        osc.connect(g); g.connect(out);
        osc.start(); lfo.start();
        nodes.push(osc, g, lfo, lfoG);
      });
      break;
    }
  }

  return { nodes, gain: out, stop };
}

/* ── store ── */

const V_KEY = "careflow:soundscape:volume";
const S_KEY = "careflow:soundscape:active";
const A_KEY = "careflow:soundscape:auto";

function readVolume(): number {
  if (typeof localStorage === "undefined") return 0.45;
  const v = parseFloat(localStorage.getItem(V_KEY) ?? "0.45");
  return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.45;
}
function readActive(): SoundscapeId | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(S_KEY) as SoundscapeId | null;
  return v && SOUNDSCAPES.some(s => s.id === v) ? v : null;
}
function readAuto(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(A_KEY) !== "0";
}

let _volume = readVolume();
let _activeId: SoundscapeId | null = readActive();
let _playing = false;
let _auto = readAuto();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

const CROSSFADE = 1.4;

function rampGain(g: GainNode, target: number, seconds = CROSSFADE) {
  const c = getCtx();
  const now = c.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(target, now + seconds);
}

export const soundscape = {
  isPlaying(): boolean { return _playing; },
  current(): SoundscapeId | null { return _activeId; },
  volume(): number { return _volume; },
  autoFollow(): boolean { return _auto; },

  setVolume(v: number) {
    _volume = Math.min(1, Math.max(0, v));
    try { localStorage.setItem(V_KEY, String(_volume)); } catch { /* noop */ }
    if (master) master.gain.value = _volume;
    emit();
  },

  setAutoFollow(on: boolean) {
    _auto = on;
    try { localStorage.setItem(A_KEY, on ? "1" : "0"); } catch { /* noop */ }
    emit();
  },

  async play(id: SoundscapeId) {
    const c = getCtx();
    if (c.state === "suspended") await c.resume();
    if (master) master.gain.value = _volume;

    // crossfade out any old fading layer instantly to avoid stacking
    if (fading) { fading.layer.stop(); fading = null; }
    if (active && active.id === id) {
      rampGain(active.layer.gain, 0.85);
      _playing = true; emit();
      return;
    }
    if (active) {
      fading = active;
      rampGain(fading.layer.gain, 0);
      const toStop = fading;
      window.setTimeout(() => { toStop.layer.stop(); if (fading === toStop) fading = null; }, CROSSFADE * 1000 + 100);
    }
    const layer = build(id);
    active = { id, layer };
    _activeId = id;
    try { localStorage.setItem(S_KEY, id); } catch { /* noop */ }
    rampGain(layer.gain, 0.85);
    _playing = true;
    emit();
  },

  pause() {
    if (!active) { _playing = false; emit(); return; }
    rampGain(active.layer.gain, 0, 0.4);
    window.setTimeout(() => {
      if (active) { active.layer.stop(); active = null; }
    }, 500);
    _playing = false;
    emit();
  },

  toggle() {
    if (_playing) this.pause();
    else if (_activeId) void this.play(_activeId);
  },
};

export function useSoundscape() {
  const [, setT] = useState(0);
  useEffect(() => {
    const fn = () => setT(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return {
    playing: _playing,
    current: _activeId,
    volume: _volume,
    autoFollow: _auto,
    play: (id: SoundscapeId) => soundscape.play(id),
    pause: () => soundscape.pause(),
    toggle: () => soundscape.toggle(),
    setVolume: (v: number) => soundscape.setVolume(v),
    setAutoFollow: (b: boolean) => soundscape.setAutoFollow(b),
  };
}

export function getSoundscape(id: SoundscapeId | null | undefined): Soundscape | null {
  return SOUNDSCAPES.find(s => s.id === id) ?? null;
}