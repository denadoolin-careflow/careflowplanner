export const AFFIRMATIONS = [
  "One small thing done is still done.",
  "You're allowed to take up space today.",
  "That's one less thing for tomorrow-you.",
  "Done is gentler than perfect.",
  "You showed up. That counts.",
  "Tiny progress is still progress.",
  "Soft and steady wins the day.",
  "You don't have to do it all to do enough.",
  "Look at you, finishing things.",
  "The list is shorter because of you.",
  "Breathe in. That one's behind you now.",
  "You're doing more than anyone sees.",
  "Care is also a kind of work — and you did it.",
  "Slow is a perfectly good speed.",
  "Even small wins deserve a quiet cheer.",
];

export function pickAffirmation() {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

// ───────── Context-aware affirmations ─────────
// Lightweight, dependency-free pools keyed by atmosphere mood and archetype.

import type { AtmosphereId } from "./atmospheres";
import type { ArchetypeId } from "./archetype-quiz";

const ATMOSPHERE_AFFIRMATIONS: Partial<Record<AtmosphereId, string[]>> = {
  "sage-sanctuary": [
    "You are the safe place. Today, be it for yourself.",
    "Roots first. The rest will grow from here.",
    "Steady hands. Soft heart. Enough.",
  ],
  "moonlit-plum": [
    "Honor the quiet — it's where you remember yourself.",
    "The moon is patient. So can you be.",
    "Reflection is also forward motion.",
  ],
  "soft-linen": [
    "Nothing has to be loud to matter.",
    "Rest is a productive verb.",
    "Breathe wide. The day can wait a moment.",
  ],
  "coastal-calm": [
    "Let the day move like tide — in, then out.",
    "You don't have to hold every wave.",
    "Spaciousness is your medicine.",
  ],
  "golden-hearth": [
    "Warm the room you're in. That's enough light.",
    "Small comforts, gathered, become a life.",
    "Tend your fire before you tend the world.",
  ],
  "dark-sage-glass": [
    "Focus is a kind of devotion.",
    "Deep work is allowed to feel slow.",
    "Quiet hours are where the real things get made.",
  ],
  dawn: [
    "Today gets to be brand new.",
    "Small beginnings still count as beginnings.",
    "You woke up. That's already a yes.",
  ],
  mist: [
    "You don't have to see the whole road yet.",
    "One soft step at a time.",
    "Unclear is not the same as wrong.",
  ],
  blossom: [
    "Something in you is opening.",
    "Bloom on your own timeline.",
    "Gentleness is its own kind of growth.",
  ],
};

const ARCHETYPE_AFFIRMATIONS: Partial<Record<ArchetypeId, string[]>> = {
  "mental-load-carrier": [
    "You don't have to hold it all in your head today.",
    "Putting it down is also doing it.",
    "Your mind is allowed an empty shelf.",
  ],
  "burnt-out-caregiver": [
    "Rest is part of caring — including for you.",
    "Doing less today is the loving choice.",
    "You're allowed to refill before you pour.",
  ],
  "reset-seeker": [
    "A small reset is still a reset.",
    "Fresh starts can be five minutes long.",
    "Begin again, gently.",
  ],
  "neurodivergent-navigator": [
    "Your pace is the right pace.",
    "One anchor task. That's the whole plan.",
    "Different is not less. It's yours.",
  ],
  "gentle-homemaker": [
    "Tending your space is tending yourself.",
    "Soft routines hold the whole house up.",
    "Beauty in the small things counts.",
  ],
  "moon-guided-planner": [
    "Move with your phase, not against it.",
    "The sky keeps time for you today.",
    "Cyclical isn't behind — it's wise.",
  ],
  "rebuilding-dreamer": [
    "You're allowed to want more — quietly.",
    "One small step toward the dream still counts.",
    "The vision is still alive in you.",
  ],
  "quiet-provider": [
    "What you carry is seen, even when silent.",
    "Steady is its own kind of love.",
    "Your quiet effort holds a whole world up.",
  ],
  "burnt-out-protector": [
    "You're allowed to put the shield down.",
    "Softness doesn't undo your strength.",
    "Today, let someone hold you back.",
  ],
  "rebuilding-father": [
    "Showing up again is the work.",
    "Your presence is the gift.",
    "Brick by brick — and you're already building.",
  ],
  "neurodivergent-dad": [
    "Routines you build for them, build for you too.",
    "One thing well today is plenty.",
    "Your brain is your gift, not your obstacle.",
  ],
  "emotional-anchor": [
    "You don't have to feel it all for everyone.",
    "Your steadiness is a quiet superpower.",
    "Set the weight down — even for an hour.",
  ],
  "overextended-helper": [
    "‘No' is also a complete sentence.",
    "Save one window today for you.",
    "You're allowed to be on your own list.",
  ],
  "soft-systems-thinker": [
    "A small refinement is still progress.",
    "Your systems are working in the background.",
    "Trust the rhythm you've built.",
  ],
  "cyclical-planner": [
    "Honor where you are in the cycle.",
    "Rest is a phase, not a failure.",
    "Your rhythm is the plan.",
  ],
};

function hashPick<T>(pool: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

/**
 * Pick an affirmation tuned to the active atmosphere and archetype.
 * Stable for a given (atmosphere, archetype, daySeed) so it doesn't flicker.
 */
export function pickContextAffirmation(opts: {
  atmosphereId?: AtmosphereId | null;
  archetypeId?: ArchetypeId | null;
  daySeed?: string;
  variant?: number;
}): string {
  const { atmosphereId, archetypeId, daySeed = "", variant = 0 } = opts;
  const pool: string[] = [];
  if (archetypeId && ARCHETYPE_AFFIRMATIONS[archetypeId]) pool.push(...ARCHETYPE_AFFIRMATIONS[archetypeId]!);
  if (atmosphereId && ATMOSPHERE_AFFIRMATIONS[atmosphereId]) pool.push(...ATMOSPHERE_AFFIRMATIONS[atmosphereId]!);
  if (pool.length === 0) pool.push(...AFFIRMATIONS);
  return hashPick(pool, `${daySeed}|${atmosphereId ?? ""}|${archetypeId ?? ""}|${variant}`);
}