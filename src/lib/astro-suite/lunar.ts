export type MoonPhase =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export interface MoonPhaseRitual {
  phase: MoonPhase;
  label: string;
  theme: string;
  description: string;
  glyph: string; // simple emoji-glyph fallback
  checklist: string[];
  lowEnergy: string[];
  affirmation: string;
  tarotPrompt: string;
  /** A short, tailored invitation that ties the prompt to this phase's mood. */
  tarotInvitation: string;
  /** One-line bridge that hands the question off into the checklist that follows. */
  tarotBridge: string;
}

export const MOON_RITUALS: Record<MoonPhase, MoonPhaseRitual> = {
  "new": {
    phase: "new",
    label: "New Moon",
    theme: "quiet beginnings, small intentions",
    description:
      "A soft reset. You don't have to plan your whole life — just notice one quiet wish.",
    glyph: "🌑",
    checklist: [
      "Sit still for one slow breath",
      "Name one tiny intention for this cycle",
      "Drink a full glass of water",
      "Tidy a single surface (just one)",
      "Write 1–2 lines about what you'd like more of",
    ],
    lowEnergy: [
      "Take three slow breaths",
      "Whisper one small intention",
      "Drink water",
    ],
    affirmation: "I am allowed to begin again, gently.",
    tarotPrompt: "What seed wants to be planted this cycle?",
    tarotInvitation:
      "The dark sky is a clean page. Let one quiet wish surface — nothing has to be decided yet.",
    tarotBridge: "Carry that one wish into the small acts below.",
  },
  "waxing-crescent": {
    phase: "waxing-crescent",
    label: "Waxing Crescent",
    theme: "first stirrings, small commitments",
    description:
      "Something is starting to move. Honor it with one small action — not ten.",
    glyph: "🌒",
    checklist: [
      "Choose one tiny step toward your intention",
      "Step outside for 2 minutes of fresh air",
      "Light a candle or open a window",
      "Send one kind message (to yourself or someone)",
      "Note one thing that felt like progress today",
    ],
    lowEnergy: [
      "Name your one small step out loud",
      "Open a window",
      "Drink something warm",
    ],
    affirmation: "Small is still moving.",
    tarotPrompt: "What is one gentle next step?",
    tarotInvitation:
      "Something has begun to stir. Notice the shape of the very first move — not the whole staircase.",
    tarotBridge: "Let that next step become the one tiny action below.",
  },
  "first-quarter": {
    phase: "first-quarter",
    label: "First Quarter",
    theme: "honest effort, soft persistence",
    description:
      "Friction shows up here. That's normal. Choose one thing worth pushing through.",
    glyph: "🌓",
    checklist: [
      "Name one obstacle without judging it",
      "Pick one thing to keep going with — release the rest for today",
      "Move your body for 3 minutes (stretch, walk, sway)",
      "Drink water and eat something kind",
      "Write one sentence: 'Today I'm choosing ___'",
    ],
    lowEnergy: [
      "Unclench your jaw and shoulders",
      "Drink water",
      "Choose one thing to release for today",
    ],
    affirmation: "I'm allowed to keep going slowly.",
    tarotPrompt: "Where do I need to soften my grip?",
    tarotInvitation:
      "Friction is showing up. Let one knot in your jaw, your plans, or your week loosen by a single thread.",
    tarotBridge: "Bring that softening to what you choose to keep going with below.",
  },
  "waxing-gibbous": {
    phase: "waxing-gibbous",
    label: "Waxing Gibbous",
    theme: "refining, almost-there patience",
    description:
      "You're close, not done. Tend to what's already growing instead of starting more.",
    glyph: "🌔",
    checklist: [
      "Notice one thing that's working",
      "Adjust one small detail (don't redo)",
      "Step away from a screen for 5 minutes",
      "Eat slowly for one meal or snack",
      "Write 2 lines about what you're learning",
    ],
    lowEnergy: [
      "Notice one thing that's working",
      "Drink water",
      "Rest your eyes for 2 minutes",
    ],
    affirmation: "Tending counts as progress.",
    tarotPrompt: "What deserves more care, not more effort?",
    tarotInvitation:
      "You're closer than you think. Notice what's already alive — and where a small adjustment would matter more than starting over.",
    tarotBridge: "Let that one detail guide the small tending acts below.",
  },
  "full": {
    phase: "full",
    label: "Full Moon",
    theme: "fullness, honesty, soft celebration",
    description:
      "Everything is lit up — feelings included. Let yourself feel without fixing.",
    glyph: "🌕",
    checklist: [
      "Pause and name what you're feeling (one word is enough)",
      "Acknowledge one small win from this cycle",
      "Step outside or to a window — look up",
      "Drink water and stretch your back",
      "Write 3 sentences: what was full, what was hard, what's next",
      "Tell someone (or yourself) one true thing",
    ],
    lowEnergy: [
      "Look at the sky for one minute",
      "Name one feeling",
      "Place a hand on your heart",
    ],
    affirmation: "I can be full and tired at the same time.",
    tarotPrompt: "What is being illuminated for me right now?",
    tarotInvitation:
      "Everything is lit up — the bright and the tender both. Let one feeling have a name without rushing to fix it.",
    tarotBridge: "Carry that named feeling into the small acknowledgements below.",
  },
  "waning-gibbous": {
    phase: "waning-gibbous",
    label: "Waning Gibbous",
    theme: "gratitude, gentle sharing",
    description:
      "The moon is letting go of its light. You can let go of needing to hold everything.",
    glyph: "🌖",
    checklist: [
      "Name one thing you're quietly grateful for",
      "Share one small thing (a thank you, a memory, a leftover)",
      "Drink something warm",
      "Tidy one small space — no perfectionism",
      "Write one sentence about what you're integrating",
    ],
    lowEnergy: [
      "Whisper a thank-you to yourself",
      "Drink something warm",
      "Take three slow breaths",
    ],
    affirmation: "I don't have to carry everything tonight.",
    tarotPrompt: "What lesson is settling in?",
    tarotInvitation:
      "The light is softening. Notice what this cycle quietly taught you — even something small that's worth a thank-you.",
    tarotBridge: "Let that gratitude shape the small sharings below.",
  },
  "last-quarter": {
    phase: "last-quarter",
    label: "Last Quarter",
    theme: "release, honest editing",
    description:
      "Time to put something down. Not all of it — just one weight.",
    glyph: "🌗",
    checklist: [
      "Notice what feels heavy (no fixing yet)",
      "Let one thing go — a task, expectation, or thought",
      "Drink something warm",
      "Reset one small space",
      "Write 2–3 sentences about what you're processing",
    ],
    lowEnergy: [
      "Drink water",
      "Name one feeling",
      "Go to bed a little earlier if possible",
    ],
    affirmation: "Letting go is also doing something.",
    tarotPrompt: "What is ready to be released?",
    tarotInvitation:
      "Something has been heavy for a while. You don't have to release all of it — just notice the one weight that's most ready to be set down.",
    tarotBridge: "Let that one thing be the one you put down in the acts below.",
  },
  "waning-crescent": {
    phase: "waning-crescent",
    label: "Waning Crescent",
    theme: "rest, quiet repair",
    description:
      "The cycle is closing. You're allowed to do less. This is the rest part.",
    glyph: "🌘",
    checklist: [
      "Slow down once today, on purpose",
      "Put your phone down for 5 minutes",
      "Drink water and stretch",
      "Tidy one tiny corner — or don't, that's okay too",
      "Write one line: 'What I need most right now is ___'",
    ],
    lowEnergy: [
      "Lie down for 5 minutes",
      "Drink water",
      "Whisper: 'rest counts'",
    ],
    affirmation: "Rest is part of the work.",
    tarotPrompt: "What does my body need before the next cycle?",
    tarotInvitation:
      "The cycle is closing. Let your body answer first — softer, slower, warmer, quieter — without your to-do list interrupting.",
    tarotBridge: "Let that need shape the small slow-down acts below.",
  },
};

export const PHASE_ORDER: MoonPhase[] = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

/**
 * Compute current moon phase from a Date using a simple synodic-month
 * approximation (good to within a day for UI purposes).
 */
export function getMoonPhase(date: Date = new Date()): MoonPhase {
  // Known new moon reference: 2000-01-06 18:14 UTC
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.53058867; // days
  const diffDays = (date.getTime() - ref) / 86400000;
  const age = ((diffDays % synodic) + synodic) % synodic; // 0..29.53
  const frac = age / synodic; // 0..1

  if (frac < 0.0303 || frac >= 0.9697) return "new";
  if (frac < 0.2197) return "waxing-crescent";
  if (frac < 0.2803) return "first-quarter";
  if (frac < 0.4697) return "waxing-gibbous";
  if (frac < 0.5303) return "full";
  if (frac < 0.7197) return "waning-gibbous";
  if (frac < 0.7803) return "last-quarter";
  return "waning-crescent";
}

export function getMoonAgeDays(date: Date = new Date()): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodic = 29.53058867;
  const diffDays = (date.getTime() - ref) / 86400000;
  return ((diffDays % synodic) + synodic) % synodic;
}

/**
 * For each MoonPhase, the next date (>= today) when that phase occurs.
 * Today's phase returns today itself.
 */
export function getUpcomingPhaseDates(from: Date = new Date()): Record<MoonPhase, Date> {
  const synodic = 29.53058867;
  // Approximate fractional age (0..1) at the START of each phase, taken from
  // the boundaries used in getMoonPhase().
  const PHASE_START_FRAC: Record<MoonPhase, number> = {
    "new": 0.0,
    "waxing-crescent": 0.0303,
    "first-quarter": 0.2197,
    "waxing-gibbous": 0.2803,
    "full": 0.4697,
    "waning-gibbous": 0.5303,
    "last-quarter": 0.7197,
    "waning-crescent": 0.7803,
  };
  const ageDays = getMoonAgeDays(from);
  const ageFrac = ageDays / synodic;
  const todaysPhase = getMoonPhase(from);

  const out = {} as Record<MoonPhase, Date>;
  (Object.keys(PHASE_START_FRAC) as MoonPhase[]).forEach((p) => {
    if (p === todaysPhase) {
      out[p] = new Date(from.getFullYear(), from.getMonth(), from.getDate());
      return;
    }
    let delta = PHASE_START_FRAC[p] - ageFrac;
    if (delta <= 0) delta += 1; // wrap to next cycle
    const days = delta * synodic;
    const target = new Date(from.getTime() + days * 86400000);
    out[p] = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  });
  return out;
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
