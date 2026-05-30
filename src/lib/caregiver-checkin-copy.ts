/**
 * Supportive copy bank for the Mom Check-In widget.
 * Strictly non-shaming — never "you forgot" or "you missed".
 */

export type CheckinKey = "water" | "food" | "meds" | "outside" | "movement";

const NUDGES: Record<CheckinKey, string[]> = {
  water: [
    "A glass of water counts as care.",
    "Hydration is a love letter to your future self.",
    "Take two minutes for a sip and a stretch.",
  ],
  food: [
    "Something small is still something.",
    "Crackers, an apple, leftovers — all of it counts.",
    "Feed yourself the way you'd feed someone you love.",
  ],
  meds: [
    "A gentle nudge — meds when you can.",
    "Future you will thank present you.",
  ],
  outside: [
    "Even the porch counts as outside.",
    "Five minutes of sky is medicine.",
  ],
  movement: [
    "A slow stretch is movement.",
    "Pacing while folding laundry counts.",
  ],
};

export function nudgeFor(key: CheckinKey, seed = new Date().getDate()): string {
  const arr = NUDGES[key];
  return arr[seed % arr.length];
}

export const MOOD_OPTIONS: { value: string; emoji: string; label: string }[] = [
  { value: "radiant", emoji: "😊", label: "Radiant" },
  { value: "calm",    emoji: "🌿", label: "Calm" },
  { value: "tired",   emoji: "😴", label: "Tired" },
  { value: "tender",  emoji: "🤍", label: "Tender" },
  { value: "stretched", emoji: "🥺", label: "Stretched" },
  { value: "joyful",  emoji: "✨", label: "Joyful" },
];

export function energyBanner(energy: number | null): { headline: string; body: string } | null {
  if (energy == null) return null;
  if (energy <= 3) {
    return {
      headline: "🌙 Low Energy Day",
      body: "Rest counts as productive. Choose softer meals and one small win.",
    };
  }
  if (energy >= 8) {
    return {
      headline: "✨ Spacious Day",
      body: "Capacity is here — protect it for what matters most.",
    };
  }
  return null;
}