import { useEffect, useState } from "react";

export type MusicPreset = { id: string; name: string; url: string };

const KEY = "careflow:focus:music:presets:v1";
const listeners = new Set<(p: MusicPreset[]) => void>();

function read(): MusicPreset[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(p => p && p.id && p.url) : [];
  } catch { return []; }
}

function write(next: MusicPreset[]) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
  listeners.forEach(l => l(next));
}

export function getPresets(): MusicPreset[] { return read(); }

export function addPreset(name: string, url: string): MusicPreset {
  const preset: MusicPreset = {
    id: `mp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || "Untitled",
    url: url.trim(),
  };
  write([...read(), preset]);
  return preset;
}

export function removePreset(id: string) {
  write(read().filter(p => p.id !== id));
}

export function renamePreset(id: string, name: string) {
  write(read().map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p));
}

export function useMusicPresets(): [
  MusicPreset[],
  { add: (name: string, url: string) => MusicPreset; remove: (id: string) => void; rename: (id: string, name: string) => void },
] {
  const [presets, setPresets] = useState<MusicPreset[]>(read);
  useEffect(() => {
    listeners.add(setPresets);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setPresets(read()); };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(setPresets);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [presets, { add: addPreset, remove: removePreset, rename: renamePreset }];
}