import { useEffect, useState } from "react";

export type CompletionVisualKey =
  | "sparkle"
  | "confetti"
  | "ripple"
  | "glow"
  | "checkmark"
  | "stars"
  | "none";

export interface CompletionVisualMeta {
  key: CompletionVisualKey;
  label: string;
  emoji: string;
  description: string;
}

export const COMPLETION_VISUALS: CompletionVisualMeta[] = [
  { key: "sparkle",   label: "Sparkle sweep",   emoji: "✨", description: "Soft sweep with a sparkle pop." },
  { key: "confetti",  label: "Confetti burst",  emoji: "🎉", description: "Tiny confetti petals fan out." },
  { key: "ripple",    label: "Calm ripple",     emoji: "💧", description: "Expanding concentric rings." },
  { key: "glow",      label: "Warm glow",       emoji: "🌟", description: "Quiet halo pulse, no emoji." },
  { key: "checkmark", label: "Bouncy check",    emoji: "✅", description: "Bouncing checkmark badge." },
  { key: "stars",     label: "Star shower",     emoji: "⭐", description: "A few stars rise and fade." },
  { key: "none",      label: "None",            emoji: "·",  description: "No visual feedback." },
];

const KEY = "careflow:completion-visual";

export function getCompletionVisual(): CompletionVisualKey {
  try {
    const v = localStorage.getItem(KEY) as CompletionVisualKey | null;
    if (v && COMPLETION_VISUALS.some(o => o.key === v)) return v;
  } catch { /* */ }
  return "sparkle";
}
export function setCompletionVisual(v: CompletionVisualKey) {
  try { localStorage.setItem(KEY, v); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent("careflow:completion-visual-change")); } catch { /* */ }
}

export function useCompletionVisual(): CompletionVisualKey {
  const [v, setV] = useState<CompletionVisualKey>(() => getCompletionVisual());
  useEffect(() => {
    const on = () => setV(getCompletionVisual());
    window.addEventListener("careflow:completion-visual-change", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("careflow:completion-visual-change", on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return v;
}