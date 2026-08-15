/**
 * Journal prompts derived from the day's moon phase, moon sign and element.
 * Pure data — used by the planner Moon insight card.
 */
import { MOON_INFO, type MoonPhase } from "@/lib/moon";
import {
  getMoonSign,
  ELEMENT_ARCHETYPE,
  ELEMENT_EMOJI,
  SIGN_KEYWORDS,
  MOON_IN_SIGN_GUIDE,
  type ZodiacInfo,
} from "@/lib/zodiac";
import { getDayTheme } from "@/lib/planner/day-theme";

const PHASE_PROMPT: Record<MoonPhase, string> = {
  "new": "What quiet wish is asking to begin? Name it in one sentence.",
  "waxing-crescent": "What's the smallest step that would count as movement today?",
  "first-quarter": "Where is the friction, and what would you choose to keep?",
  "waxing-gibbous": "What's already growing that just needs tending?",
  "full": "What feels most lit right now — and can you feel it without fixing it?",
  "waning-gibbous": "What are you grateful for, and who could you share it with?",
  "last-quarter": "What's one thing you can let go of without guilt?",
  "waning-crescent": "What would real rest look like for the next few hours?",
};

const ELEMENT_PROMPT: Record<ZodiacInfo["element"], string> = {
  Fire: "Where does your energy want to go — and what would you do with it if nothing had to be perfect?",
  Earth: "What does your body need today, in the most practical, ordinary way?",
  Air: "What thought keeps circling? Write it out until it settles.",
  Water: "What feeling surfaced today that you haven't given words to yet?",
};

export interface MoonJournalContext {
  phase: MoonPhase;
  phaseLabel: string;
  glyph: string;
  sign: ZodiacInfo;
  elementEmoji: string;
  elementLine: string;
  keywords: string[];
  themeName: string;
  /** Ordered prompts: phase, sign, element. */
  prompts: { id: string; label: string; text: string }[];
  /** Prefilled journal body seeded with the day's context. */
  seedBody: string;
}

export function getMoonJournalContext(date: Date): MoonJournalContext {
  const theme = getDayTheme(date);
  const phase = theme.moonPhase;
  const info = MOON_INFO[phase];
  const sign = getMoonSign(date);
  const guide = MOON_IN_SIGN_GUIDE[sign.name];
  const keywords = SIGN_KEYWORDS[sign.name];

  const prompts = [
    { id: "phase", label: `${info.glyph} ${info.label}`, text: PHASE_PROMPT[phase] },
    {
      id: "sign",
      label: `${sign.symbol} Moon in ${sign.name}`,
      text: `${guide.vibe} What does that make easier — or harder — for you today?`,
    },
    { id: "element", label: `${ELEMENT_EMOJI[sign.element]} ${sign.element}`, text: ELEMENT_PROMPT[sign.element] },
  ];

  const seedBody = [
    `${info.glyph} ${info.label} · ${sign.symbol} Moon in ${sign.name} (${sign.element}) · ${theme.themeName}`,
    "",
    ELEMENT_ARCHETYPE[sign.element],
    "",
    ...prompts.map(p => `${p.text}\n`),
  ].join("\n");

  return {
    phase,
    phaseLabel: info.label,
    glyph: info.glyph,
    sign,
    elementEmoji: ELEMENT_EMOJI[sign.element],
    elementLine: ELEMENT_ARCHETYPE[sign.element],
    keywords,
    themeName: theme.themeName,
    prompts,
    seedBody,
  };
}
