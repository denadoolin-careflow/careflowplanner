/**
 * Lightweight WebAudio soundscape player. No external assets.
 * Generates ambient layers from filtered noise + sine motifs.
 */

export type SoundscapeId =
  | "off"
  | "rain"
  | "ocean"
  | "forest"
  | "fireplace"
  | "brown"
  | "cafe";

export interface SoundscapeMeta {
  id: SoundscapeId;
  label: string;
  emoji: string;
  hint: string;
}

export const SOUNDSCAPES: SoundscapeMeta[] = [
  { id: "off",       label: "Silence",   emoji: "🤫", hint: "Just the timer." },
  { id: "rain",      label: "Rain",      emoji: "🌧️", hint: "Steady soft rainfall." },
  { id: "ocean",     label: "Ocean",     emoji: "🌊", hint: "Slow rolling waves." },
  { id: "forest",    label: "Forest",    emoji: "🌲", hint: "Wind in the trees, distant birds." },
  { id: "fireplace", label: "Fireplace", emoji: "🔥", hint: "Low warm crackle." },
  { id: "brown",     label: "Brown noise", emoji: "🌫️", hint: "Deep, even hum." },
  { id: "cafe",      label: "Café",      emoji: "☕", hint: "Soft murmur and clinks." },
];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let active: { id: SoundscapeId; nodes: AudioNode[]; stop: () => void } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor: typeof AudioContext | undefined =
        (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function makeNoiseBuffer(ac: AudioContext, seconds = 4): AudioBuffer {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function makeBrownBuffer(ac: AudioContext, seconds = 4): AudioBuffer {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

function loop(ac: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function build(id: SoundscapeId): { nodes: AudioNode[]; stop: () => void } | null {
  const ac = getCtx(); if (!ac || !master) return null;
  const out = ac.createGain();
  out.gain.value = 0;
  out.connect(master);
  // fade in
  out.gain.linearRampToValueAtTime(1, ac.currentTime + 1.2);
  const created: AudioNode[] = [out];
  const intervals: number[] = [];

  const noise = makeNoiseBuffer(ac);
  const brown = makeBrownBuffer(ac);

  if (id === "rain") {
    const src = loop(ac, noise);
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 600;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4500;
    const g = ac.createGain(); g.gain.value = 0.5;
    src.connect(hp).connect(lp).connect(g).connect(out);
    created.push(src, hp, lp, g);
  } else if (id === "ocean") {
    const src = loop(ac, noise);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    const g = ac.createGain(); g.gain.value = 0.3;
    // LFO swell
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.35;
    lfo.connect(lfoG).connect(g.gain);
    lfo.start();
    src.connect(lp).connect(g).connect(out);
    created.push(src, lp, g, lfo, lfoG);
  } else if (id === "forest") {
    const src = loop(ac, noise);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    const g = ac.createGain(); g.gain.value = 0.18;
    src.connect(lp).connect(g).connect(out);
    created.push(src, lp, g);
    // Occasional bird chirps
    const chirp = () => {
      if (!ac) return;
      const o = ac.createOscillator(); o.type = "sine";
      const og = ac.createGain(); og.gain.value = 0;
      o.frequency.setValueAtTime(1800 + Math.random() * 900, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(1100, ac.currentTime + 0.18);
      og.gain.linearRampToValueAtTime(0.08, ac.currentTime + 0.03);
      og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22);
      o.connect(og).connect(out);
      o.start(); o.stop(ac.currentTime + 0.25);
    };
    intervals.push(window.setInterval(() => { if (Math.random() < 0.5) chirp(); }, 2400));
  } else if (id === "fireplace") {
    const src = loop(ac, brown);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
    const g = ac.createGain(); g.gain.value = 0.45;
    src.connect(lp).connect(g).connect(out);
    created.push(src, lp, g);
    // crackles
    intervals.push(window.setInterval(() => {
      if (!ac) return;
      const cs = ac.createBufferSource();
      const len = Math.floor(ac.sampleRate * 0.06);
      const cb = ac.createBuffer(1, len, ac.sampleRate);
      const d = cb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      cs.buffer = cb;
      const cg = ac.createGain(); cg.gain.value = 0.18;
      const chp = ac.createBiquadFilter(); chp.type = "highpass"; chp.frequency.value = 1500;
      cs.connect(chp).connect(cg).connect(out);
      cs.start();
    }, 350));
  } else if (id === "brown") {
    const src = loop(ac, brown);
    const g = ac.createGain(); g.gain.value = 0.45;
    src.connect(g).connect(out);
    created.push(src, g);
  } else if (id === "cafe") {
    const src = loop(ac, noise);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
    const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 200;
    const g = ac.createGain(); g.gain.value = 0.22;
    src.connect(hp).connect(lp).connect(g).connect(out);
    created.push(src, hp, lp, g);
    // tiny clinks
    intervals.push(window.setInterval(() => {
      if (!ac || Math.random() > 0.3) return;
      const o = ac.createOscillator(); o.type = "triangle";
      o.frequency.value = 1800 + Math.random() * 1200;
      const og = ac.createGain(); og.gain.value = 0;
      og.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
      o.connect(og).connect(out);
      o.start(); o.stop(ac.currentTime + 0.2);
    }, 1600));
  }

  return {
    nodes: created,
    stop: () => {
      if (!ac) return;
      try {
        out.gain.cancelScheduledValues(ac.currentTime);
        out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4);
      } catch {}
      intervals.forEach(clearInterval);
      window.setTimeout(() => {
        created.forEach(n => { try { (n as any).stop?.(); } catch {} try { n.disconnect(); } catch {} });
      }, 500);
    },
  };
}

export const soundscapes = {
  current(): SoundscapeId { return active?.id ?? "off"; },
  setVolume(v: number) {
    const ac = getCtx(); if (!ac || !master) return;
    master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), ac.currentTime + 0.15);
  },
  getVolume(): number { return master?.gain.value ?? 0.4; },
  play(id: SoundscapeId) {
    if (active?.id === id) return;
    if (active) { active.stop(); active = null; }
    if (id === "off") return;
    const built = build(id);
    if (built) active = { id, ...built };
  },
  stop() { if (active) { active.stop(); active = null; } },
};