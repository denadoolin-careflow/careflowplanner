/**
 * Lightweight Major Arcana deck for daily inspiration.
 * Card pick is deterministic per local date so it stays steady through the day.
 */
export interface TarotCard {
  name: string;
  glyph: string;          // single emoji glyph
  meaning: string;        // one-line meaning
  guidance: string;       // longer caregiver-friendly guidance paragraph
  keywords: string[];
}

export const MAJOR_ARCANA: TarotCard[] = [
  { name: "The Fool",          glyph: "🌱", meaning: "Fresh starts, gentle leaps, trust the path.",
    guidance: "A soft beginning is asked of you today. You don't need the whole map — one honest step is enough.",
    keywords: ["beginnings", "trust", "lightness"] },
  { name: "The Magician",      glyph: "✨", meaning: "Focus your tools — small action, real impact.",
    guidance: "You already have what you need. Pick one tool, one task, and let it count for the whole day.",
    keywords: ["focus", "agency", "craft"] },
  { name: "The High Priestess",glyph: "🌙", meaning: "Listen inward — answers arrive in quiet.",
    guidance: "Make space for the soft voice. Five minutes of stillness will tell you what your list cannot.",
    keywords: ["intuition", "stillness", "knowing"] },
  { name: "The Empress",       glyph: "🌸", meaning: "Nurture — yourself first, then others.",
    guidance: "Tending counts as progress. A warm meal, a clean corner, a kind word — all of it matters.",
    keywords: ["nurture", "comfort", "care"] },
  { name: "The Emperor",       glyph: "🏛", meaning: "Steady structure, gentle boundaries.",
    guidance: "A little structure protects your energy. Set one clear boundary today without apology.",
    keywords: ["structure", "boundaries", "calm"] },
  { name: "The Hierophant",    glyph: "🕯", meaning: "Lean on a routine that already works.",
    guidance: "You don't have to reinvent today. Repeat what has helped before — that's wisdom, not laziness.",
    keywords: ["routine", "tradition", "anchor"] },
  { name: "The Lovers",        glyph: "💞", meaning: "Choose what you truly value.",
    guidance: "When in doubt, pick the option that feels most like you. Connection matters more than completion today.",
    keywords: ["choice", "connection", "values"] },
  { name: "The Chariot",       glyph: "🛞", meaning: "Move forward with quiet resolve.",
    guidance: "Momentum is yours if you keep it small and steady. Pick a direction and let the day carry you a little.",
    keywords: ["momentum", "resolve", "forward"] },
  { name: "Strength",          glyph: "🦁", meaning: "Soft power — patience beats force.",
    guidance: "Your gentleness is your strength today. Stay patient with yourself, especially when things feel slow.",
    keywords: ["patience", "softness", "courage"] },
  { name: "The Hermit",        glyph: "🕯", meaning: "A quiet pause clarifies the way.",
    guidance: "Steal a slow moment alone. The to-do list will still be there, and you'll see it more kindly afterward.",
    keywords: ["solitude", "reflection", "pause"] },
  { name: "Wheel of Fortune",  glyph: "🎡", meaning: "Cycles turn — meet today as it is.",
    guidance: "Energy ebbs and flows. Notice what season you're in and plan with — not against — it.",
    keywords: ["cycles", "acceptance", "flow"] },
  { name: "Justice",           glyph: "⚖️", meaning: "Fairness — to others and to yourself.",
    guidance: "Be as fair with yourself today as you are with the people you care for. Rest is part of doing your share.",
    keywords: ["balance", "fairness", "truth"] },
  { name: "The Hanged One",    glyph: "🪢", meaning: "A new angle — try the opposite approach.",
    guidance: "If a task feels stuck, try it sideways. Switch the order, ask for help, or simply let it wait.",
    keywords: ["perspective", "surrender", "pause"] },
  { name: "Death",             glyph: "🍂", meaning: "Let one thing end so something can begin.",
    guidance: "Release a small task, habit, or expectation that no longer fits. Making space is sacred work.",
    keywords: ["release", "ending", "renewal"] },
  { name: "Temperance",        glyph: "🫗", meaning: "Gentle pacing — mix rest with effort.",
    guidance: "Blend work and rest in equal sips. Today is built for steady, balanced motion.",
    keywords: ["balance", "pacing", "blend"] },
  { name: "The Devil",         glyph: "⛓", meaning: "Notice what's quietly draining you.",
    guidance: "Name one obligation that drains more than it gives. You don't have to fix it today — just see it clearly.",
    keywords: ["awareness", "release", "honesty"] },
  { name: "The Tower",         glyph: "🌩", meaning: "Plans may shift — make room for change.",
    guidance: "If the day breaks open, soften your grip. What falls away often clears space for something kinder.",
    keywords: ["change", "release", "renewal"] },
  { name: "The Star",          glyph: "🌟", meaning: "Hope, restoration, calm direction.",
    guidance: "A quiet light is leading you. Trust the small signs of hope — they are how the day rebuilds you.",
    keywords: ["hope", "healing", "calm"] },
  { name: "The Moon",          glyph: "🌙", meaning: "Honor your feelings without fixing them.",
    guidance: "Feelings are weather, not commands. Let them pass through, name them, and keep moving gently.",
    keywords: ["intuition", "feeling", "softness"] },
  { name: "The Sun",           glyph: "☀️", meaning: "Warmth, ease, simple joy.",
    guidance: "Let something small make you smile today. Bright energy multiplies when you share it.",
    keywords: ["joy", "ease", "vitality"] },
  { name: "Judgement",         glyph: "🔔", meaning: "A small awakening — answer the call.",
    guidance: "Listen for the nudge that's been repeating. A short reply, a small choice, can shift the week.",
    keywords: ["clarity", "awakening", "renewal"] },
  { name: "The World",         glyph: "🌍", meaning: "Completion — celebrate a quiet finish.",
    guidance: "A chapter is rounding off. Notice it, name it, and let yourself feel proud — even of the small things.",
    keywords: ["completion", "wholeness", "gratitude"] },
];

/** Deterministic card-of-the-day from a date. */
export function tarotForDate(date: Date = new Date()): TarotCard {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // simple hash that varies across days
  const seed = (y * 372 + m * 31 + d) % MAJOR_ARCANA.length;
  return MAJOR_ARCANA[seed];
}