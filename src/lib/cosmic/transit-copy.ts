/**
 * Static, astrology-friendly prose copy for transit deeper-insight panels.
 * Pure data — no AI, no network. Keyed by event signature.
 *
 * Tone follows the Cosmic Flow guardrails: warm, invitational, grounded,
 * never deterministic or fear-based. Personalization (e.g. "lights up your
 * 5th house of joy & play") is added at render time, not stored here.
 */
import type { Sign, Planet } from "@/lib/transits";
import type { MoonPhase } from "@/lib/moon";

export interface TransitCopy {
  /** 1-3 sentence deeper-meaning paragraph. */
  insight: string;
  /** A short reflective question for the journal entry. */
  journalPrompt: string;
  /** Warm 8-14 word affirmation, first person. */
  affirmation: string;
}

const SIGN_GIFT: Record<Sign, string> = {
  Aries: "courage and the joy of a clean beginning",
  Taurus: "steadiness and the wisdom of slow comfort",
  Gemini: "curiosity and the lightness of switching gears",
  Cancer: "tenderness and a soft homecoming",
  Leo: "warm-hearted visibility and generous play",
  Virgo: "careful tending and the love of useful things",
  Libra: "balance, partnership, and asking for help",
  Scorpio: "honest depth and protective intimacy",
  Sagittarius: "hopeful momentum and a wider horizon",
  Capricorn: "patient mastery and quiet authority",
  Aquarius: "fresh thinking and chosen community",
  Pisces: "imagination, intuition, and gentle dreaming",
};

const PLANET_FLAVOR: Record<Planet | "Moon" | "Sun", string> = {
  Sun: "your sense of purpose and core identity",
  Moon: "your inner weather and emotional needs",
  Mercury: "how you think, talk, learn, and move through the day",
  Venus: "what you love, value, and find beautiful",
  Mars: "your drive, desire, and the way you take action",
  Jupiter: "where you're invited to expand and trust",
  Saturn: "where you're being asked to commit and build",
};

export function ingressCopy(planet: Planet, sign: Sign): TransitCopy {
  const flavor = PLANET_FLAVOR[planet] ?? "this part of life";
  const gift = SIGN_GIFT[sign];
  return {
    insight: `${planet} is entering ${sign}, which gently re-tunes ${flavor} toward ${gift}. You may notice the texture of these themes shifting over the next few weeks — there's no rush to perform the change. Let it land in its own time.`,
    journalPrompt: `Where in your life is ${flavor} asking for a softer, more ${sign}-flavored approach right now?`,
    affirmation: `I let ${planet} guide me toward ${sign.toLowerCase()}-shaped grace.`,
  };
}

const RETRO_INSIGHT: Record<string, TransitCopy> = {
  Mercury: {
    insight: "Mercury retrograde is a review season, not a catastrophe. It's a gentle invitation to re-read, re-do, re-connect — to slow your replies and re-check your assumptions. Things that get rewritten now tend to come back stronger.",
    journalPrompt: "What conversation, idea, or plan is asking to be revisited with fresh eyes?",
    affirmation: "I move slower, listen deeper, and trust what I rediscover.",
  },
  Venus: {
    insight: "Venus retrograde turns the gaze inward toward values, money, and the people we love. Old relationships may echo, old aesthetics may resurface — it's an invitation to refine what truly matters before announcing anything new.",
    journalPrompt: "What do you actually value right now — and how does your life reflect (or not reflect) that?",
    affirmation: "I revisit what I love with patience and honesty.",
  },
  Mars: {
    insight: "Mars retrograde feels like driving with one foot on the brake. Effort feels heavier, momentum stalls — and that's strategic. Rest, repair, and refine your aim. The push will return; meanwhile, the pause is the practice.",
    journalPrompt: "Where have you been pushing too hard? What would honoring the pause look like?",
    affirmation: "I conserve my energy and trust slower forward motion.",
  },
  Jupiter: {
    insight: "Jupiter retrograde is internal expansion. Rather than launching outward, the invitation is to refine the belief — to study, plan, and notice what kind of growth actually nourishes you.",
    journalPrompt: "What belief or vision is asking to be refined before it's expanded?",
    affirmation: "I grow inward first, and trust the outward in time.",
  },
  Saturn: {
    insight: "Saturn retrograde is a structural audit. Where are your commitments wobbly? Which agreements need a careful repair? This is a season for tending the bones of your life with gentle honesty.",
    journalPrompt: "Which structure or commitment in your life is asking for repair, not replacement?",
    affirmation: "I repair what I've built with patience and care.",
  },
};

export function retroCopy(planet: Planet): TransitCopy {
  return RETRO_INSIGHT[planet] ?? {
    insight: `${planet} stations retrograde — a season of review. Be gentle with yourself; this isn't a setback, it's a reset.`,
    journalPrompt: `What does ${planet} energy in your life want you to revisit?`,
    affirmation: "I let review become reorientation.",
  };
}

export function directCopy(planet: Planet): TransitCopy {
  return {
    insight: `${planet} stations direct — forward motion gradually returns. The lessons from the review season don't disappear; they become the wisdom you carry into the next chapter. Ease in. Don't sprint.`,
    journalPrompt: `What did you learn during ${planet}'s review that's worth keeping?`,
    affirmation: "I move forward with what I've gathered.",
  };
}

export function phaseCopy(phase: MoonPhase, sign: Sign | null): TransitCopy {
  const signLine = sign ? ` in ${sign}` : "";
  const gift = sign ? SIGN_GIFT[sign] : "the present moment";
  switch (phase) {
    case "new":
      return {
        insight: `This New Moon${signLine} is a quiet seed point — a gentle invitation to set intentions around ${gift}. New Moons reward subtlety more than spectacle; a whispered yes here can carry the whole cycle.`,
        journalPrompt: `What seed are you planting this cycle — and what does it need to take root?`,
        affirmation: `I plant my intention in soft, fertile ground.`,
      };
    case "full":
      return {
        insight: `This Full Moon${signLine} brings something to light — a culmination, a feeling, a truth you've been moving toward. The themes of ${gift} may feel especially vivid. Honor what's ripe; don't force what isn't.`,
        journalPrompt: `What is being illuminated for you right now — and how do you want to honor it?`,
        affirmation: `I let the light show me what's already true.`,
      };
    case "first-quarter":
      return {
        insight: `First quarter moons bring a productive friction — the seed pushes against the soil. Expect a recommitment moment around ${gift}; choose one priority and protect it.`,
        journalPrompt: `Where is friction pointing you back to what matters?`,
        affirmation: `I meet resistance with gentle resolve.`,
      };
    case "last-quarter":
      return {
        insight: `Last quarter moons are a clearing — what's outgrown its season is ready to be set down. The themes of ${gift} may quietly ask to be edited rather than expanded.`,
        journalPrompt: `What's ready to be released, archived, or laid to rest?`,
        affirmation: `I let go of what has already served its purpose.`,
      };
    default:
      return {
        insight: `The Moon moves through ${gift} — a gentle backdrop for the day.`,
        journalPrompt: `What does this moment ask of you?`,
        affirmation: `I move at the pace of the moon.`,
      };
  }
}

export function eclipseCopy(isLunar: boolean): TransitCopy {
  return isLunar
    ? {
        insight: "A Lunar Eclipse is a louder Full Moon — feelings, endings, and revelations often arrive in concentrated form. The wise move is rarely a big move. Let what surfaces be information, not instruction. Postpone big decisions a week.",
        journalPrompt: "What is the eclipse asking you to see — and what would gentle honor of it look like?",
        affirmation: "I let what's revealed soften me, not rush me.",
      }
    : {
        insight: "A Solar Eclipse is a turbo-charged New Moon — a reset point that often quietly redirects your trajectory. The themes that bubble up now are seeds for the next six months. Plant gently; don't sign or launch under the eclipse.",
        journalPrompt: "What new direction is quietly being seeded — and what does it need from you to take root?",
        affirmation: "I trust the redirection, even before I understand it.",
      };
}

export function vocCopy(): TransitCopy {
  return {
    insight: "Void-of-course Moon is a gentle pause in the rhythm of the day. Decisions made now tend to drift; that's not a flaw, it's a feature. Use this window for rest, daydreaming, and small repeatable tasks.",
    journalPrompt: "What would it feel like to let yourself drift for a little while today?",
    affirmation: "I let myself be unfinished today.",
  };
}

/* ---------------------------------------------------------------- */
/* Aspect + cazimi copy                                              */
/* ---------------------------------------------------------------- */

const ASPECT_TONE: Record<string, { gist: string; affirm: string; prompt: string }> = {
  conjunction: { gist: "blend energies — a fresh fusion of intentions", affirm: "I let these two forces meet inside me with grace.", prompt: "What new theme is being born from this meeting?" },
  sextile:     { gist: "open a soft, productive opportunity", affirm: "I take the small open door in front of me.", prompt: "Where is a small yes available today?" },
  square:      { gist: "ask for a brave, conscious choice", affirm: "I meet friction as a sign of growth.", prompt: "Where is tension showing you what matters?" },
  trine:       { gist: "create easy, supportive flow", affirm: "I let what's easy be easy.", prompt: "What flows naturally for you right now?" },
  opposition:  { gist: "ask for a wise middle ground", affirm: "I honor both sides without abandoning myself.", prompt: "Which two truths need to coexist today?" },
};

export function aspectCopy(planetA: Planet, planetB: Planet, aspect: string): TransitCopy {
  const tone = ASPECT_TONE[aspect] ?? ASPECT_TONE.conjunction;
  const a = PLANET_FLAVOR[planetA] ?? "this part of life";
  const b = PLANET_FLAVOR[planetB] ?? "another part of life";
  return {
    insight: `${planetA} ${aspect} ${planetB} — ${a} and ${b} ${tone.gist}. Today's window asks you to notice how these themes are interacting and to move with intention rather than reaction.`,
    journalPrompt: tone.prompt,
    affirmation: tone.affirm,
  };
}

export function cazimiCopy(planet: Planet): TransitCopy {
  return {
    insight: `${planet} is cazimi — held in the heart of the Sun within seventeen minutes of exact. This is a brief, luminous empowerment: whatever ${planet} governs in your life is being clarified and dignified today.`,
    journalPrompt: `What does ${planet} want you to see clearly today, while the light is this strong?`,
    affirmation: `I receive the clarity ${planet} is offering me.`,
  };
}

/* ---------------------------------------------------------------- */
/* House-of-natal-chart copy — used when overlaying transit on user  */
/* ---------------------------------------------------------------- */

export const HOUSE_THEME: Record<number, string> = {
  1:  "self, body, and how you show up",
  2:  "money, values, and what you call yours",
  3:  "siblings, learning, daily errands, and short trips",
  4:  "home, family, roots, and emotional foundation",
  5:  "joy, play, creativity, romance, and children",
  6:  "daily work, routines, health, and service",
  7:  "partnerships, close one-on-ones, and mirrors",
  8:  "shared resources, intimacy, and deep change",
  9:  "meaning, travel, study, and the bigger story",
  10: "career, public role, and what you're known for",
  11: "friendships, community, and future hopes",
  12: "rest, reflection, the unseen, and inner work",
};

export function houseOverlayLine(house: number): string {
  return `Lighting up your ${ordinal(house)} House of ${HOUSE_THEME[house]}.`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/* ---------------------------------------------------------------- */
/* Unified resolver                                                  */
/* ---------------------------------------------------------------- */

import type { CosmicEvent } from "@/lib/cosmic/events";

export function copyForEvent(event: CosmicEvent): TransitCopy {
  if (event.kind === "ingress" && event.planet && event.sign) return ingressCopy(event.planet, event.sign);
  if (event.kind === "retrograde" && event.planet) return retroCopy(event.planet);
  if (event.kind === "direct" && event.planet) return directCopy(event.planet);
  if (event.kind === "phase" && event.phase) return phaseCopy(event.phase, (event.sign ?? null) as Sign | null);
  if (event.kind === "eclipse") return eclipseCopy(event.phase === "full");
  if (event.kind === "voc") return vocCopy();
  if (event.kind === "aspect" && event.planet && event.partner && event.aspect)
    return aspectCopy(event.planet, event.partner as Planet, event.aspect);
  if (event.kind === "cazimi" && event.planet) return cazimiCopy(event.planet);
  return {
    insight: "A small cosmic shift today — gentle enough to be felt only if you're listening.",
    journalPrompt: "What does your body or mind want you to notice today?",
    affirmation: "I notice what wants to be noticed.",
  };
}

/* ---------------------------------------------------------------- */
/* Astrology-friendly guidance: do more / do less / expect / tarot   */
/* ---------------------------------------------------------------- */

export interface TransitGuidance {
  doMore: string;
  doLess: string;
  whatToExpect: string;
  tarot: { card: string; meaning: string };
}

const TAROT_BY_PLANET: Record<string, { card: string; meaning: string }> = {
  Sun:     { card: "The Sun",       meaning: "Vitality, visibility, joyful clarity." },
  Moon:    { card: "The High Priestess", meaning: "Intuition, inner tides, listening within." },
  Mercury: { card: "The Magician",  meaning: "Communication, focus, weaving ideas into form." },
  Venus:   { card: "The Empress",   meaning: "Love, beauty, abundance, gentle care." },
  Mars:    { card: "The Tower",     meaning: "Decisive action, breakthrough, clearing the path." },
  Jupiter: { card: "The Wheel of Fortune", meaning: "Expansion, opportunity, trust the turning." },
  Saturn:  { card: "The World",     meaning: "Mastery, completion, structured devotion." },
};
const TAROT_BY_PHASE: Record<string, { card: string; meaning: string }> = {
  new:            { card: "The Fool",  meaning: "Beginning again with open hands." },
  "first-quarter":{ card: "Strength",  meaning: "Gentle courage to keep going." },
  full:           { card: "The Star",  meaning: "Illumination, hope, what's been hidden." },
  "last-quarter": { card: "Death",     meaning: "Honoring an ending, making room." },
};

function tarotFor(event: CosmicEvent) {
  if (event.kind === "phase" && event.phase) return TAROT_BY_PHASE[event.phase] ?? TAROT_BY_PLANET.Moon;
  if (event.kind === "eclipse") return { card: "Judgement", meaning: "A reckoning that re-arranges what comes next." };
  if (event.kind === "voc") return { card: "The Hanged Man", meaning: "Suspension — let the day breathe." };
  if (event.planet && TAROT_BY_PLANET[event.planet]) return TAROT_BY_PLANET[event.planet];
  return { card: "The Star", meaning: "A gentle, hopeful pause." };
}

export function guidanceForEvent(event: CosmicEvent): TransitGuidance {
  const tarot = tarotFor(event);
  if (event.kind === "retrograde" && event.planet) {
    return {
      doMore: `Re-read, repair, and revisit ${event.planet.toLowerCase()} themes (review, slow down, reconnect).`,
      doLess: `Launch new ${event.planet.toLowerCase()}-flavored commitments or assume you've been understood the first time.`,
      whatToExpect: `Plans may loop back; delays often surface what wants refining. Energy is inward-facing.`,
      tarot,
    };
  }
  if (event.kind === "direct" && event.planet) {
    return {
      doMore: `Take one small forward step that honors what you learned during the review.`,
      doLess: `Sprint, over-correct, or try to make up for the slower season in a day.`,
      whatToExpect: `Forward motion returns gradually — clarity over speed.`,
      tarot,
    };
  }
  if (event.kind === "phase") {
    const p = event.phase;
    if (p === "new") return { doMore: "Set one quiet intention, rest early, listen.", doLess: "Big announcements or overscheduling.", whatToExpect: "A subtle seed-point — small whispers count.", tarot };
    if (p === "full") return { doMore: "Celebrate, share, feel, and reflect on what's ripe.", doLess: "Force a fix on what just wants to be felt.", whatToExpect: "Heightened emotion and clarity — things come to light.", tarot };
    if (p === "first-quarter") return { doMore: "Recommit to one priority and protect it.", doLess: "Add new commitments before honoring the current one.", whatToExpect: "Productive friction — the seed pushes through soil.", tarot };
    if (p === "last-quarter") return { doMore: "Archive, edit, and let go of what's outgrown its season.", doLess: "Start anything new you'll regret in a week.", whatToExpect: "A clearing — quieter energy, ready for release.", tarot };
  }
  if (event.kind === "eclipse") {
    return { doMore: "Rest, hydrate, journal, and let what surfaces be information.", doLess: "Sign, launch, or have the hard conversation this week.", whatToExpect: "Outsized feelings, surprise news, and quiet redirections.", tarot };
  }
  if (event.kind === "voc") {
    return { doMore: "Drift, daydream, do small repeatable tasks.", doLess: "Make important decisions or send big asks.", whatToExpect: "A soft pause — things you start may not land as planned.", tarot };
  }
  if (event.kind === "ingress" && event.planet && event.sign) {
    return { doMore: `Lean ${event.planet.toLowerCase()} themes into the texture of ${event.sign}.`, doLess: `Cling to the prior sign's flavor or rush the transition.`, whatToExpect: `A gradual tonal shift over the next few weeks.`, tarot };
  }
  if (event.kind === "aspect" && event.planet && event.partner && event.aspect) {
    const tone = ASPECT_TONE[event.aspect] ?? ASPECT_TONE.conjunction;
    const more: Record<string, string> = {
      conjunction: "Notice what's beginning between these two themes — give the blend room.",
      sextile: "Take the small open door — one yes, one outreach, one experiment.",
      square: "Choose consciously where these forces want to push each other.",
      trine: "Lean into what flows — momentum is on your side.",
      opposition: "Listen to both sides, then choose a middle the supports both.",
    };
    const less: Record<string, string> = {
      conjunction: "Force the meaning of the blend before it reveals itself.",
      sextile: "Wait for a perfect opportunity — this one wants a soft yes.",
      square: "Pretend the friction isn't there or take it personally.",
      trine: "Coast so much you forget to honor what's working.",
      opposition: "Pick a side just to relieve the tension.",
    };
    return {
      doMore: more[event.aspect] ?? "Move with intention.",
      doLess: less[event.aspect] ?? "React from the surface.",
      whatToExpect: `${event.planet} and ${event.partner} ${tone.gist}. Today is the peak of this exchange.`,
      tarot,
    };
  }
  if (event.kind === "cazimi" && event.planet) {
    return {
      doMore: `Pay attention — ${event.planet} themes are being clarified and dignified now.`,
      doLess: `Dismiss insights or distract yourself through this window.`,
      whatToExpect: `A brief, luminous moment of clarity around ${event.planet}.`,
      tarot,
    };
  }
  return {
    doMore: "Move at the pace of kindness today.",
    doLess: "Overschedule or expect peak performance.",
    whatToExpect: "An ordinary cosmic day — workable and warm.",
    tarot,
  };
}