export type ZodiacSign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export interface ZodiacInfo {
  name: ZodiacSign;
  symbol: string; // unicode glyph
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  ruler: string;
  /** Sun-sign season window, formatted for display */
  seasonRange: string;
}

const SIGN_TABLE: { name: ZodiacSign; symbol: string; element: ZodiacInfo["element"]; modality: ZodiacInfo["modality"]; ruler: string; seasonRange: string }[] = [
  { name: "Aries",       symbol: "♈", element: "Fire",  modality: "Cardinal", ruler: "Mars",    seasonRange: "Mar 21 – Apr 19" },
  { name: "Taurus",      symbol: "♉", element: "Earth", modality: "Fixed",    ruler: "Venus",   seasonRange: "Apr 20 – May 20" },
  { name: "Gemini",      symbol: "♊", element: "Air",   modality: "Mutable",  ruler: "Mercury", seasonRange: "May 21 – Jun 20" },
  { name: "Cancer",      symbol: "♋", element: "Water", modality: "Cardinal", ruler: "Moon",    seasonRange: "Jun 21 – Jul 22" },
  { name: "Leo",         symbol: "♌", element: "Fire",  modality: "Fixed",    ruler: "Sun",     seasonRange: "Jul 23 – Aug 22" },
  { name: "Virgo",       symbol: "♍", element: "Earth", modality: "Mutable",  ruler: "Mercury", seasonRange: "Aug 23 – Sep 22" },
  { name: "Libra",       symbol: "♎", element: "Air",   modality: "Cardinal", ruler: "Venus",   seasonRange: "Sep 23 – Oct 22" },
  { name: "Scorpio",     symbol: "♏", element: "Water", modality: "Fixed",    ruler: "Pluto",   seasonRange: "Oct 23 – Nov 21" },
  { name: "Sagittarius", symbol: "♐", element: "Fire",  modality: "Mutable",  ruler: "Jupiter", seasonRange: "Nov 22 – Dec 21" },
  { name: "Capricorn",   symbol: "♑", element: "Earth", modality: "Cardinal", ruler: "Saturn",  seasonRange: "Dec 22 – Jan 19" },
  { name: "Aquarius",    symbol: "♒", element: "Air",   modality: "Fixed",    ruler: "Uranus",  seasonRange: "Jan 20 – Feb 18" },
  { name: "Pisces",      symbol: "♓", element: "Water", modality: "Mutable",  ruler: "Neptune", seasonRange: "Feb 19 – Mar 20" },
];

const SIGN_BY_NAME: Record<ZodiacSign, typeof SIGN_TABLE[number]> = SIGN_TABLE.reduce(
  (acc, s) => ({ ...acc, [s.name]: s }),
  {} as Record<ZodiacSign, typeof SIGN_TABLE[number]>,
);

/** Emoji per zodiac sign — for warmer, more legible UI than unicode glyphs. */
export const SIGN_EMOJI: Record<ZodiacSign, string> = {
  Aries: "♈️",
  Taurus: "♉️",
  Gemini: "♊️",
  Cancer: "♋️",
  Leo: "♌️",
  Virgo: "♍️",
  Libra: "♎️",
  Scorpio: "♏️",
  Sagittarius: "♐️",
  Capricorn: "♑️",
  Aquarius: "♒️",
  Pisces: "♓️",
};

/** Element emoji — fire 🔥, earth 🌿, air 💨, water 💧. */
export const ELEMENT_EMOJI: Record<ZodiacInfo["element"], string> = {
  Fire: "🔥",
  Earth: "🌿",
  Air: "💨",
  Water: "💧",
};

/** One-line archetype per element — used under Moon panel as zodiac insight. */
export const ELEMENT_ARCHETYPE: Record<ZodiacInfo["element"], string> = {
  Fire:  "Fire moon — move with warmth; act from spark, not pressure.",
  Earth: "Earth moon — slow, steady, body-led; small grounded choices win.",
  Air:   "Air moon — make space to think and talk it through.",
  Water: "Water moon — feel first, plan second; honor what surfaces.",
};

/** Three keyword vibes per sign — for the Moon panel zodiac insight chip row. */
export const SIGN_KEYWORDS: Record<ZodiacSign, string[]> = {
  Aries:       ["spark", "courage", "begin"],
  Taurus:      ["steady", "savor", "tend"],
  Gemini:      ["curious", "connect", "play"],
  Cancer:      ["nurture", "home", "soften"],
  Leo:         ["radiate", "create", "celebrate"],
  Virgo:       ["refine", "tidy", "serve"],
  Libra:       ["balance", "relate", "beautify"],
  Scorpio:     ["depth", "release", "renew"],
  Sagittarius: ["expand", "explore", "trust"],
  Capricorn:   ["build", "commit", "structure"],
  Aquarius:    ["reimagine", "gather", "innovate"],
  Pisces:      ["dream", "rest", "imagine"],
};

/** Lookup full sign info (element, modality, ruler…) by sign name. */
export function getSignInfo(sign: ZodiacSign): ZodiacInfo {
  return SIGN_BY_NAME[sign];
}

/** Sun sign (zodiac season) for a given date. */
export function getZodiac(date: Date): ZodiacInfo {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // start dates for sun signs
  const ranges: { sign: ZodiacSign; from: [number, number] }[] = [
    { sign: "Capricorn",   from: [12, 22] },
    { sign: "Sagittarius", from: [11, 22] },
    { sign: "Scorpio",     from: [10, 23] },
    { sign: "Libra",       from: [9, 23] },
    { sign: "Virgo",       from: [8, 23] },
    { sign: "Leo",         from: [7, 23] },
    { sign: "Cancer",      from: [6, 21] },
    { sign: "Gemini",      from: [5, 21] },
    { sign: "Taurus",      from: [4, 20] },
    { sign: "Aries",       from: [3, 21] },
    { sign: "Pisces",      from: [2, 19] },
    { sign: "Aquarius",    from: [1, 20] },
  ];
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) {
    return SIGN_BY_NAME["Capricorn"];
  }
  for (const r of ranges) {
    const [zm, zd] = r.from;
    if (m > zm || (m === zm && d >= zd)) {
      return SIGN_BY_NAME[r.sign];
    }
  }
  return SIGN_BY_NAME["Capricorn"];
}

export const MOON_PHASE_EMOJI: Record<string, string> = {
  "new": "🌑",
  "waxing-crescent": "🌒",
  "first-quarter": "🌓",
  "waxing-gibbous": "🌔",
  "full": "🌕",
  "waning-gibbous": "🌖",
  "last-quarter": "🌗",
  "waning-crescent": "🌘",
};

/* -------------------------------------------------------------------------- */
/*  Moon-sign approximation                                                   */
/*  Uses mean ecliptic longitude of the Moon (Meeus, simplified). Accurate to */
/*  roughly ±1–2°, which is enough to identify the current zodiac sign on     */
/*  most days. Sign boundary days may be off by a few hours.                  */
/* -------------------------------------------------------------------------- */

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Mean ecliptic longitude of the Moon in degrees (0–360). */
export function moonEclipticLongitude(date: Date): number {
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525; // Julian centuries since J2000
  // Mean longitude
  const Lp = 218.3164477 + 481267.88123421 * T;
  // Mean elongation
  const D  = 297.8501921 + 445267.1114034 * T;
  // Sun's mean anomaly
  const M  = 357.5291092 + 35999.0502909 * T;
  // Moon's mean anomaly
  const Mp = 134.9633964 + 477198.8675055 * T;
  // Argument of latitude
  const F  = 93.2720950  + 483202.0175233 * T;

  const d2r = Math.PI / 180;
  // Largest periodic terms (degrees) — truncated Meeus series.
  const lon =
    Lp +
    6.289 * Math.sin(Mp * d2r) +
    -1.274 * Math.sin((Mp - 2 * D) * d2r) +
    0.658 * Math.sin(2 * D * d2r) +
    -0.186 * Math.sin(M * d2r) +
    -0.059 * Math.sin((2 * Mp - 2 * D) * d2r) +
    -0.057 * Math.sin((Mp - 2 * D + M) * d2r) +
    0.053 * Math.sin((Mp + 2 * D) * d2r) +
    0.046 * Math.sin((2 * D - M) * d2r) +
    0.041 * Math.sin((Mp - M) * d2r) +
    -0.035 * Math.sin(D * d2r) +
    -0.031 * Math.sin((Mp + M) * d2r) +
    -0.015 * Math.sin((2 * F - 2 * D) * d2r) +
    0.011 * Math.sin((Mp - 4 * D) * d2r);

  return norm360(lon);
}

/** Zodiac sign the Moon is in on the given date (approximation). */
export function getMoonSign(date: Date = new Date()): ZodiacInfo {
  const lon = moonEclipticLongitude(date);
  const idx = Math.floor(lon / 30); // 0..11, starting at Aries
  return SIGN_BY_NAME[SIGN_TABLE[idx].name];
}

/* -------------------------------------------------------------------------- */
/*  Per-sign moon vibe + tiny action guide                                    */
/* -------------------------------------------------------------------------- */

export interface MoonInSignGuide {
  vibe: string;          // one-line mood
  body: string;          // what the body tends to want
  actions: string[];     // 3 small, doable actions
  avoid: string;         // one thing to ease off
}

export const MOON_IN_SIGN_GUIDE: Record<ZodiacSign, MoonInSignGuide> = {
  Aries: {
    vibe: "Quick spark, short fuse. Energy wants somewhere to go.",
    body: "Restless legs, warm head. Move before you decide.",
    actions: [
      "Do one 2-minute task you've been avoiding",
      "Walk briskly around the block, no phone",
      "Say 'no' to one thing that doesn't fit today",
    ],
    avoid: "Snap reactions — pause one breath before replying.",
  },
  Taurus: {
    vibe: "Slow, sensory, steady. Your nervous system is asking for comfort.",
    body: "Wants warmth, food, soft textures, a long exhale.",
    actions: [
      "Eat one meal slowly with no screen",
      "Make your space 5% cozier (blanket, candle, tidy nook)",
      "Put hands in warm water for one minute",
    ],
    avoid: "Forcing change — let things settle today.",
  },
  Gemini: {
    vibe: "Curious, chatty, scattered. Many tabs open in your head.",
    body: "Twitchy hands, dry throat. Hydration helps focus.",
    actions: [
      "Brain-dump everything onto paper for 3 minutes",
      "Send one message you've been putting off",
      "Read or listen to something tiny and interesting",
    ],
    avoid: "Multitasking — pick one thread and pull it.",
  },
  Cancer: {
    vibe: "Soft, tender, home-y. Feelings are close to the surface.",
    body: "Wants belly warmth, water, and a quiet corner.",
    actions: [
      "Make a warm drink and sip it slowly",
      "Text someone who feels like home",
      "Tidy one small spot that bothers you",
    ],
    avoid: "Doom-scrolling — protect your inner weather today.",
  },
  Leo: {
    vibe: "Warm, expressive, wanting to be seen — even softly.",
    body: "Heart and back area; stand a little taller.",
    actions: [
      "Wear or use one thing that makes you feel like you",
      "Compliment someone honestly (or yourself in the mirror)",
      "Make one small thing — doodle, voice memo, photo",
    ],
    avoid: "Performing for people who aren't really watching.",
  },
  Virgo: {
    vibe: "Tidy, analytical, helper-mode. Watch for over-fixing.",
    body: "Stomach and gut; ease off caffeine, add water.",
    actions: [
      "Reset one small surface or drawer (timer: 5 min)",
      "Write a 3-item list — only 3",
      "Do one kind thing for your future self",
    ],
    avoid: "Self-criticism dressed up as 'just being honest.'",
  },
  Libra: {
    vibe: "Relational, balance-seeking. You may feel everyone's mood but yours.",
    body: "Lower back and hips; gentle movement helps.",
    actions: [
      "Make one small aesthetic choice on purpose (music, light, scent)",
      "Ask yourself: 'What do I actually want?' — answer in one line",
      "Send a small kindness to one person",
    ],
    avoid: "Saying yes to be polite — it's okay to pause.",
  },
  Scorpio: {
    vibe: "Deep, private, intense. Things feel heavier than they look.",
    body: "Wants quiet, dim light, and a long shower or bath.",
    actions: [
      "Write something honest — no one has to read it",
      "Take a long shower or wash your face with intention",
      "Choose one thing to keep private today",
    ],
    avoid: "Re-reading old messages or stories.",
  },
  Sagittarius: {
    vibe: "Open-sky energy. You want elsewhere — even just out the window.",
    body: "Hips, thighs; stretch them, even briefly.",
    actions: [
      "Get outside for 5 minutes, no destination",
      "Learn one tiny new thing (a word, a fact, a recipe)",
      "Plan one small thing to look forward to",
    ],
    avoid: "Overcommitting tomorrow because today feels expansive.",
  },
  Capricorn: {
    vibe: "Grounded, responsible, slightly serious. Long-game energy.",
    body: "Knees, joints, jaw. Soften the jaw on purpose.",
    actions: [
      "Do one 10-minute slice of a bigger task",
      "Write one realistic next step (not the whole plan)",
      "Drink water and stop working at a chosen time",
    ],
    avoid: "Measuring today against a perfect day.",
  },
  Aquarius: {
    vibe: "Detached, big-picture, slightly outside it all.",
    body: "Ankles, circulation; move your feet and hands.",
    actions: [
      "Step away from a screen for 10 minutes",
      "Notice one pattern in your week — write it down",
      "Do one small thing for someone outside yourself",
    ],
    avoid: "Numbing out — connection (even tiny) helps today.",
  },
  Pisces: {
    vibe: "Dreamy, porous, emotional tides close in.",
    body: "Feet and lymph; warm socks, foot soak, water.",
    actions: [
      "Listen to one song fully, eyes closed",
      "Write a feeling without trying to explain it",
      "Drink water and rest your eyes for 5 minutes",
    ],
    avoid: "Absorbing other people's moods — protect your edges.",
  },
};
