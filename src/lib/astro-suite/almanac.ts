/**
 * Almanac — a hand-written reference index for the 12 zodiac signs and the
 * 10 classical + modern planets used elsewhere in the app.
 *
 * Each entry is intentionally short and conversational so it reads like a
 * pocket guide rather than a textbook. Fields are kept stable across signs
 * and planets so the UI can render them with one component.
 */

import type { ZodiacSign, ZodiacInfo } from "./zodiac";
import { getSignInfo, ELEMENT_EMOJI } from "./zodiac";

export type Element = "Fire" | "Earth" | "Air" | "Water";

/** Planets we have entries for. Matches the set used by the journal/transits. */
export type PlanetName =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export interface AlmanacEntry {
  /** Stable URL slug (lowercase, hyphenated). */
  slug: string;
  /** Display name. */
  name: string;
  /** Unicode glyph or emoji used in chips. */
  glyph: string;
  /** One-line essence — what this energy is "about". */
  meaning: string;
  /** Longer meaning, 1–3 sentences. */
  description: string;
  /** Element association. Planets get their classical element. */
  element: Element;
  /** Fire → 🔥, etc. (precomputed for convenience.) */
  elementGlyph: string;
  /** Healthy expressions of this energy. */
  positive: string[];
  /** Shadow / unhealthy expressions of the same energy. */
  negative: string[];
  /** Tarot card most often associated. */
  tarot: string;
  /** A short first-person affirmation. */
  affirmation: string;
  /** Small, doable activities that work with this energy. */
  activities: string[];
  /** Extra facts (modality + ruler for signs, sign rulerships for planets). */
  facts: { label: string; value: string }[];
}

/* -------------------------------------------------------------------------- */
/*  Signs                                                                     */
/* -------------------------------------------------------------------------- */

interface SignSeed {
  meaning: string;
  description: string;
  element: Element; // duplicated for clarity, validated against ZodiacInfo
  positive: string[];
  negative: string[];
  tarot: string;
  affirmation: string;
  activities: string[];
}

const SIGN_SEEDS: Record<ZodiacSign, SignSeed> = {
  Aries: {
    meaning: "The spark — initiative, courage, fresh starts.",
    description:
      "Aries is the first push: the seedling cracking the soil. It thrives on direct action and gets restless when made to wait.",
    element: "Fire",
    positive: ["Brave", "Direct", "Energizing", "Pioneering"],
    negative: ["Impatient", "Combative", "Reckless", "Self-centered"],
    tarot: "The Emperor",
    affirmation: "I trust the impulse to begin.",
    activities: [
      "Start something small you've been postponing",
      "Move briskly for 10 minutes — outside if you can",
      "Make a clean decision without consulting anyone",
    ],
  },
  Taurus: {
    meaning: "The body — grounding, sensuality, steady value.",
    description:
      "Taurus is the long inhale of the year. It wants what is real, what can be touched, tasted, and trusted to last.",
    element: "Earth",
    positive: ["Steady", "Sensual", "Loyal", "Resourceful"],
    negative: ["Stubborn", "Possessive", "Resistant", "Indulgent"],
    tarot: "The Hierophant",
    affirmation: "I deserve comfort and slow pleasure.",
    activities: [
      "Eat one meal slowly with no screen",
      "Make your space 5% cozier",
      "Spend ten quiet minutes in the garden or with a plant",
    ],
  },
  Gemini: {
    meaning: "The messenger — curiosity, language, connection.",
    description:
      "Gemini lives in conversation and pattern. It collects, links, and hands ideas around — sometimes faster than it can finish them.",
    element: "Air",
    positive: ["Curious", "Witty", "Adaptable", "Communicative"],
    negative: ["Scattered", "Restless", "Gossipy", "Two-faced"],
    tarot: "The Lovers",
    affirmation: "I let curiosity guide me, one thread at a time.",
    activities: [
      "Brain-dump every open tab in your head onto paper",
      "Send one message you've been avoiding",
      "Read or listen to something tiny and new",
    ],
  },
  Cancer: {
    meaning: "The home — feeling, memory, belonging.",
    description:
      "Cancer is the inner tide. It keeps the family album, makes the soup, and remembers what other people forgot to grieve.",
    element: "Water",
    positive: ["Nurturing", "Intuitive", "Loyal", "Protective"],
    negative: ["Moody", "Clingy", "Defensive", "Resentful"],
    tarot: "The Chariot",
    affirmation: "My feelings are information, not weather I have to fix.",
    activities: [
      "Make a warm drink and sip it slowly",
      "Text someone who feels like home",
      "Tidy one small spot that has been bothering you",
    ],
  },
  Leo: {
    meaning: "The heart — creativity, warmth, generous self-expression.",
    description:
      "Leo is the noon sun: it wants to give light and to be seen giving it. At its best, it warms a room without burning anyone.",
    element: "Fire",
    positive: ["Warm", "Generous", "Playful", "Expressive"],
    negative: ["Prideful", "Dramatic", "Approval-seeking", "Domineering"],
    tarot: "Strength",
    affirmation: "I shine without apology, and I let others shine too.",
    activities: [
      "Wear or use one thing that makes you feel like you",
      "Make something small for the joy of it",
      "Compliment someone honestly",
    ],
  },
  Virgo: {
    meaning: "The craft — care, refinement, useful service.",
    description:
      "Virgo notices what others miss. It edits, mends, and tends — happiest when its precision is in service of something it loves.",
    element: "Earth",
    positive: ["Discerning", "Helpful", "Skillful", "Reliable"],
    negative: ["Critical", "Anxious", "Perfectionistic", "Self-blaming"],
    tarot: "The Hermit",
    affirmation: "I do what I can, with care, and that is enough.",
    activities: [
      "Reset one small surface (5-minute timer)",
      "Write a list of only three things",
      "Do one kind thing for your future self",
    ],
  },
  Libra: {
    meaning: "The mirror — relationship, beauty, fairness.",
    description:
      "Libra weighs. It wants harmony but not at the cost of truth, and is always asking quietly: what does the other side need?",
    element: "Air",
    positive: ["Diplomatic", "Charming", "Fair", "Aesthetic"],
    negative: ["Indecisive", "People-pleasing", "Avoidant", "Passive"],
    tarot: "Justice",
    affirmation: "I can be kind and still tell the truth.",
    activities: [
      "Make one small aesthetic choice on purpose",
      "Ask: 'What do I actually want?' — answer in one line",
      "Send a small kindness to one person",
    ],
  },
  Scorpio: {
    meaning: "The depths — intimacy, power, transformation.",
    description:
      "Scorpio doesn't skim. It goes to the bottom of the feeling, the relationship, the question — and trusts what it finds there.",
    element: "Water",
    positive: ["Devoted", "Perceptive", "Resilient", "Honest"],
    negative: ["Jealous", "Controlling", "Secretive", "Vengeful"],
    tarot: "Death",
    affirmation: "I can let what is ending end, and trust what is honest.",
    activities: [
      "Write something honest — no one has to read it",
      "Take a long shower with intention",
      "Choose one thing to keep private today",
    ],
  },
  Sagittarius: {
    meaning: "The horizon — meaning, freedom, the bigger story.",
    description:
      "Sagittarius shoots its arrow toward whatever is further on. It wants the wide view, the foreign word, the next country of mind.",
    element: "Fire",
    positive: ["Optimistic", "Adventurous", "Honest", "Philosophical"],
    negative: ["Tactless", "Restless", "Preachy", "Avoidant of detail"],
    tarot: "Temperance",
    affirmation: "There is more world than I have seen — I am allowed to look.",
    activities: [
      "Get outside for 5 minutes with no destination",
      "Learn one tiny new thing",
      "Plan one small thing to look forward to",
    ],
  },
  Capricorn: {
    meaning: "The mountain — structure, mastery, the long game.",
    description:
      "Capricorn climbs. It is patient with hard things and respects what was built well. It wants its life to mean something it can point at.",
    element: "Earth",
    positive: ["Disciplined", "Responsible", "Patient", "Capable"],
    negative: ["Rigid", "Pessimistic", "Workaholic", "Withholding"],
    tarot: "The Devil",
    affirmation: "I can take the long way and still arrive.",
    activities: [
      "Do one 10-minute slice of a bigger task",
      "Write one realistic next step (not the whole plan)",
      "Stop working at a chosen time",
    ],
  },
  Aquarius: {
    meaning: "The signal — vision, freedom, the collective.",
    description:
      "Aquarius zooms out. It sees the system around the person, the future inside the present, and the room everyone else is missing.",
    element: "Air",
    positive: ["Inventive", "Independent", "Humanitarian", "Original"],
    negative: ["Aloof", "Contrarian", "Detached", "Stubbornly principled"],
    tarot: "The Star",
    affirmation: "My difference is part of how I belong.",
    activities: [
      "Step away from a screen for ten minutes",
      "Notice one pattern in your week and write it down",
      "Do one small thing for someone outside yourself",
    ],
  },
  Pisces: {
    meaning: "The sea — imagination, compassion, dissolving edges.",
    description:
      "Pisces feels everything at once. It is the dream behind the day, the song in the background, the soft place where things forgive each other.",
    element: "Water",
    positive: ["Compassionate", "Imaginative", "Intuitive", "Gentle"],
    negative: ["Escapist", "Boundary-less", "Self-pitying", "Foggy"],
    tarot: "The Moon",
    affirmation: "I can feel deeply and still keep my own shore.",
    activities: [
      "Listen to one song fully with eyes closed",
      "Write a feeling without trying to explain it",
      "Drink water and rest your eyes for five minutes",
    ],
  },
};

const ALL_SIGNS: ZodiacSign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SIGN_ENTRIES: AlmanacEntry[] = ALL_SIGNS.map((name) => {
  const info: ZodiacInfo = getSignInfo(name);
  const seed = SIGN_SEEDS[name];
  return {
    slug: name.toLowerCase(),
    name,
    glyph: info.symbol,
    meaning: seed.meaning,
    description: seed.description,
    element: info.element,
    elementGlyph: ELEMENT_EMOJI[info.element],
    positive: seed.positive,
    negative: seed.negative,
    tarot: seed.tarot,
    affirmation: seed.affirmation,
    activities: seed.activities,
    facts: [
      { label: "Element", value: `${ELEMENT_EMOJI[info.element]} ${info.element}` },
      { label: "Modality", value: info.modality },
      { label: "Ruler", value: info.ruler },
      { label: "Season", value: info.seasonRange },
    ],
  };
});

/* -------------------------------------------------------------------------- */
/*  Planets                                                                   */
/* -------------------------------------------------------------------------- */

interface PlanetSeed {
  glyph: string;
  /** Element used as a "vibe" tag — classical assignments. */
  element: Element;
  meaning: string;
  description: string;
  rules: string;          // sign(s) it traditionally rules
  positive: string[];
  negative: string[];
  tarot: string;
  affirmation: string;
  activities: string[];
}

const PLANET_SEEDS: Record<PlanetName, PlanetSeed> = {
  Sun: {
    glyph: "☉",
    element: "Fire",
    meaning: "Identity — the steady self you are becoming.",
    description:
      "The Sun is the through-line of who you are. It's where you generate your own light instead of borrowing someone else's.",
    rules: "Leo",
    positive: ["Radiant", "Confident", "Generous", "Centered"],
    negative: ["Egotistical", "Domineering", "Pridefully isolated", "Performative"],
    tarot: "The Sun",
    affirmation: "I am allowed to take up the space of myself.",
    activities: [
      "Name one thing you were proud of this week",
      "Do something creative just because",
      "Stand in real sunlight for five minutes",
    ],
  },
  Moon: {
    glyph: "☽",
    element: "Water",
    meaning: "Feeling — the inner weather you live inside.",
    description:
      "The Moon is what you need in order to feel safe, fed, and home. It's the part of you that remembers childhood without trying.",
    rules: "Cancer",
    positive: ["Tender", "Receptive", "Caring", "Intuitive"],
    negative: ["Moody", "Reactive", "Withdrawn", "Over-attached"],
    tarot: "The High Priestess",
    affirmation: "My feelings deserve a soft place to land.",
    activities: [
      "Notice tonight's moon, even briefly",
      "Cook or eat something nourishing on purpose",
      "Write one sentence about how today actually felt",
    ],
  },
  Mercury: {
    glyph: "☿",
    element: "Air",
    meaning: "Mind — language, learning, the small daily exchanges.",
    description:
      "Mercury is how you think, talk, write, and move information around. It links inner and outer like a quick courier.",
    rules: "Gemini & Virgo",
    positive: ["Quick", "Articulate", "Curious", "Adaptive"],
    negative: ["Anxious", "Tricky", "Overthinking", "Sharp-tongued"],
    tarot: "The Magician",
    affirmation: "My words can be both honest and kind.",
    activities: [
      "Write the email you've been avoiding",
      "Take a walk while you sort one thought",
      "Read one short thing you find genuinely interesting",
    ],
  },
  Venus: {
    glyph: "♀",
    element: "Earth",
    meaning: "Love & value — what you find beautiful and want closer.",
    description:
      "Venus is the magnet of pleasure: art, taste, attraction, and the things you simply enjoy. It also names what you believe you're worth.",
    rules: "Taurus & Libra",
    positive: ["Loving", "Aesthetic", "Diplomatic", "Generous"],
    negative: ["Vain", "Indulgent", "Conflict-avoidant", "Transactional"],
    tarot: "The Empress",
    affirmation: "Pleasure is not a reward I have to earn.",
    activities: [
      "Make one space around you a little prettier",
      "Send affection to someone — written or spoken",
      "Spend on, or savour, one small luxury",
    ],
  },
  Mars: {
    glyph: "♂",
    element: "Fire",
    meaning: "Drive — desire, anger, the courage to act.",
    description:
      "Mars is your engine. It says yes, no, now, and not-this. Healthy Mars protects what you love without burning the room down.",
    rules: "Aries (& classically Scorpio)",
    positive: ["Brave", "Decisive", "Energetic", "Protective"],
    negative: ["Aggressive", "Impulsive", "Combative", "Burned out"],
    tarot: "The Tower",
    affirmation: "My anger is data; my action is choice.",
    activities: [
      "Move your body hard for 10 minutes",
      "Say a clean 'no' to one thing today",
      "Finish a tiny task you've been circling",
    ],
  },
  Jupiter: {
    glyph: "♃",
    element: "Fire",
    meaning: "Growth — meaning, expansion, generous yes.",
    description:
      "Jupiter is the part of you that believes things can be bigger. It teaches, travels, and finds the meaning in the mess.",
    rules: "Sagittarius (& classically Pisces)",
    positive: ["Optimistic", "Generous", "Wise", "Faithful"],
    negative: ["Excessive", "Preachy", "Over-promising", "Lazy with detail"],
    tarot: "Wheel of Fortune",
    affirmation: "I make room for more than I think I deserve.",
    activities: [
      "Say yes to one slightly bigger thing",
      "Teach someone a small thing you know",
      "Plan a learning hour for next week",
    ],
  },
  Saturn: {
    glyph: "♄",
    element: "Earth",
    meaning: "Structure — limits, time, mastery through repetition.",
    description:
      "Saturn is the long teacher. It draws the line, asks for the work, and respects you enough to let consequences exist.",
    rules: "Capricorn (& classically Aquarius)",
    positive: ["Disciplined", "Mature", "Responsible", "Committed"],
    negative: ["Rigid", "Cold", "Pessimistic", "Self-denying"],
    tarot: "The World",
    affirmation: "I can keep one promise to myself today.",
    activities: [
      "Finish — don't start — one thing",
      "Block 25 minutes for the boring useful task",
      "Write one small commitment and date it",
    ],
  },
  Uranus: {
    glyph: "♅",
    element: "Air",
    meaning: "Awakening — change, freedom, the lightning insight.",
    description:
      "Uranus interrupts on purpose. It frees what was stuck, sometimes gently and sometimes by knocking things over.",
    rules: "Aquarius",
    positive: ["Original", "Liberating", "Inventive", "Future-aware"],
    negative: ["Erratic", "Detached", "Disruptive", "Contrarian"],
    tarot: "The Fool",
    affirmation: "I'm allowed to change my mind in public.",
    activities: [
      "Break one tiny routine on purpose",
      "Try a different route, food, or playlist",
      "Write down one thing you're outgrowing",
    ],
  },
  Neptune: {
    glyph: "♆",
    element: "Water",
    meaning: "Dream — imagination, mysticism, dissolving edges.",
    description:
      "Neptune softens the borders between self and world. It is where you make art, pray, fall in love, and sometimes get lost.",
    rules: "Pisces",
    positive: ["Compassionate", "Imaginative", "Mystical", "Forgiving"],
    negative: ["Escapist", "Confused", "Idealizing", "Self-deceiving"],
    tarot: "The Hanged Man",
    affirmation: "I can dream and still know what is real.",
    activities: [
      "Take a nap or a long bath without guilt",
      "Make something with no goal",
      "Sit with one feeling and don't explain it",
    ],
  },
  Pluto: {
    glyph: "♇",
    element: "Water",
    meaning: "Power — death, rebirth, what cannot stay the same.",
    description:
      "Pluto goes to the root and pulls. It dismantles what was no longer alive so that something more honest can grow back.",
    rules: "Scorpio",
    positive: ["Transformative", "Honest", "Resilient", "Empowering"],
    negative: ["Controlling", "Obsessive", "Destructive", "Manipulative"],
    tarot: "Judgement",
    affirmation: "I survive what is true better than what is hidden.",
    activities: [
      "Throw out, delete, or unfollow one thing",
      "Name one fear out loud or on paper",
      "Notice a power dynamic — yours or someone else's",
    ],
  },
};

const ALL_PLANETS: PlanetName[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];

export const PLANET_ENTRIES: AlmanacEntry[] = ALL_PLANETS.map((name) => {
  const seed = PLANET_SEEDS[name];
  return {
    slug: name.toLowerCase(),
    name,
    glyph: seed.glyph,
    meaning: seed.meaning,
    description: seed.description,
    element: seed.element,
    elementGlyph: ELEMENT_EMOJI[seed.element],
    positive: seed.positive,
    negative: seed.negative,
    tarot: seed.tarot,
    affirmation: seed.affirmation,
    activities: seed.activities,
    facts: [
      { label: "Element vibe", value: `${ELEMENT_EMOJI[seed.element]} ${seed.element}` },
      { label: "Rules", value: seed.rules },
    ],
  };
});

/* -------------------------------------------------------------------------- */
/*  Houses (whole-sign)                                                       */
/* -------------------------------------------------------------------------- */

interface HouseSeed {
  /** 1..12 */
  num: number;
  /** Roman numeral for the chip glyph. */
  roman: string;
  /** Vibe element — Fire (1/5/9), Earth (2/6/10), Air (3/7/11), Water (4/8/12). */
  element: Element;
  /** Modern title (e.g. "Self & body"). */
  title: string;
  meaning: string;
  description: string;
  /** Classical natural ruler / sign association. */
  naturalSign: string;
  positive: string[];
  negative: string[];
  tarot: string;
  affirmation: string;
  activities: string[];
}

const HOUSE_SEEDS: HouseSeed[] = [
  {
    num: 1, roman: "I", element: "Fire",
    title: "Self & body",
    meaning: "How you arrive — body, presence, first impression.",
    description:
      "The 1st house is the front door of the chart: your physical self, your immediate vibe, and the way you start things.",
    naturalSign: "Aries",
    positive: ["Vital", "Direct", "Self-aware", "Embodied"],
    negative: ["Self-absorbed", "Reactive", "Image-anxious", "Pushy"],
    tarot: "The Magician",
    affirmation: "I'm allowed to take up the space of myself.",
    activities: [
      "Move your body for ten minutes",
      "Notice your posture — adjust once",
      "Say your own name kindly to yourself",
    ],
  },
  {
    num: 2, roman: "II", element: "Earth",
    title: "Resources & values",
    meaning: "What you steward — money, possessions, self-worth.",
    description:
      "The 2nd house is the ground under your feet: income, belongings, and the felt sense of your own worth independent of others.",
    naturalSign: "Taurus",
    positive: ["Resourceful", "Steady", "Grounded", "Self-valuing"],
    negative: ["Possessive", "Stingy", "Stuck", "Self-undervaluing"],
    tarot: "The Empress",
    affirmation: "I am worth steady, simple care.",
    activities: [
      "Tidy one drawer or surface",
      "Look at one number you've been avoiding",
      "Buy or savour one small good thing",
    ],
  },
  {
    num: 3, roman: "III", element: "Air",
    title: "Mind & near world",
    meaning: "Daily exchanges — siblings, short trips, small talk.",
    description:
      "The 3rd is your immediate neighborhood: how you learn, the messages you send, the people you bump into all the time.",
    naturalSign: "Gemini",
    positive: ["Curious", "Adaptive", "Articulate", "Connective"],
    negative: ["Scattered", "Gossipy", "Anxious", "Surface-only"],
    tarot: "The Lovers",
    affirmation: "Small exchanges add up to a life.",
    activities: [
      "Send one message you've been postponing",
      "Take a short walk with no destination",
      "Read one short article fully",
    ],
  },
  {
    num: 4, roman: "IV", element: "Water",
    title: "Roots & home",
    meaning: "Where you come from — family, ancestry, private life.",
    description:
      "The 4th house is the inner room: the home you're building and the home you came from. It's the soil your life grows out of.",
    naturalSign: "Cancer",
    positive: ["Nurturing", "Protective", "Loyal", "Rooted"],
    negative: ["Defensive", "Enmeshed", "Withdrawn", "Stuck-in-the-past"],
    tarot: "The Moon",
    affirmation: "I get to make the home I needed.",
    activities: [
      "Make one corner of your space cozier",
      "Cook something a parent or elder used to make",
      "Sit at home for ten quiet minutes",
    ],
  },
  {
    num: 5, roman: "V", element: "Fire",
    title: "Pleasure & creation",
    meaning: "Play — romance, creativity, what brings you alive.",
    description:
      "The 5th is the joyful, expressive house: love affairs, art-for-its-own-sake, children, and the things you do because they're fun.",
    naturalSign: "Leo",
    positive: ["Playful", "Generous", "Creative", "Romantic"],
    negative: ["Showy", "Dramatic", "Attention-hungry", "Risk-blind"],
    tarot: "The Sun",
    affirmation: "I am allowed to enjoy my life.",
    activities: [
      "Make something with no goal",
      "Flirt — with a person, a project, or an idea",
      "Do one thing purely for pleasure",
    ],
  },
  {
    num: 6, roman: "VI", element: "Earth",
    title: "Work & care",
    meaning: "Routines — daily work, health, service to others.",
    description:
      "The 6th house is the rhythm of your days: the small habits, the body's maintenance, and the way you show up to do real work.",
    naturalSign: "Virgo",
    positive: ["Diligent", "Caring", "Skillful", "Methodical"],
    negative: ["Critical", "Anxious", "Overworking", "Self-denying"],
    tarot: "The Hermit",
    affirmation: "Doing one small thing well is enough today.",
    activities: [
      "Do one tiny chore you've been circling",
      "Drink water; stretch for two minutes",
      "Tidy your work area before you start",
    ],
  },
  {
    num: 7, roman: "VII", element: "Air",
    title: "Partnerships",
    meaning: "Close others — marriage, contracts, open enemies.",
    description:
      "The 7th is the mirror house: the people who meet you face-to-face, including partners, close collaborators, and the people who openly oppose you.",
    naturalSign: "Libra",
    positive: ["Diplomatic", "Fair", "Relational", "Collaborative"],
    negative: ["Codependent", "Conflict-avoidant", "People-pleasing", "Projecting"],
    tarot: "Justice",
    affirmation: "I can be in relationship and stay myself.",
    activities: [
      "Tell one person what you actually need",
      "Make eye contact in a real conversation",
      "Write down what you want from a relationship",
    ],
  },
  {
    num: 8, roman: "VIII", element: "Water",
    title: "Shared depths",
    meaning: "Intimacy — joint resources, debts, transformation.",
    description:
      "The 8th house is the underground river: shared money, sex, grief, and the slow rebuilds that change you in a way you can't undo.",
    naturalSign: "Scorpio",
    positive: ["Intimate", "Honest", "Resilient", "Insightful"],
    negative: ["Controlling", "Secretive", "Obsessive", "Resentful"],
    tarot: "Death",
    affirmation: "What is true is safer than what is hidden.",
    activities: [
      "Name one thing you've been avoiding feeling",
      "Pay or face one bill you've been dodging",
      "Have one honest two-sentence conversation",
    ],
  },
  {
    num: 9, roman: "IX", element: "Fire",
    title: "Wider horizons",
    meaning: "Belief — travel, study, publishing, philosophy.",
    description:
      "The 9th house is the long view: the books that change you, the trips that stretch you, and the beliefs you live by.",
    naturalSign: "Sagittarius",
    positive: ["Open-minded", "Faithful", "Adventurous", "Big-picture"],
    negative: ["Preachy", "Restless", "Dogmatic", "Avoiding details"],
    tarot: "The Wheel of Fortune",
    affirmation: "I let my world get a little bigger today.",
    activities: [
      "Read or watch something from a culture not your own",
      "Plan a trip — even a one-hour one",
      "Write one belief you're rethinking",
    ],
  },
  {
    num: 10, roman: "X", element: "Earth",
    title: "Public path",
    meaning: "Vocation — career, reputation, your visible work.",
    description:
      "The 10th house is the top of the chart: how the world sees your work, your authority, and the legacy you're slowly building.",
    naturalSign: "Capricorn",
    positive: ["Ambitious", "Responsible", "Strategic", "Respected"],
    negative: ["Status-anxious", "Cold", "Workaholic", "Overly cautious"],
    tarot: "The Emperor",
    affirmation: "My work can be both ambitious and kind.",
    activities: [
      "Do one visible thing for your work today",
      "Send the email that moves a project forward",
      "Write the next milestone you're aiming at",
    ],
  },
  {
    num: 11, roman: "XI", element: "Air",
    title: "Community & hopes",
    meaning: "Friends, groups, the bigger goals you share.",
    description:
      "The 11th house is the wider circle: friends, networks, causes, and the future you're building with other people.",
    naturalSign: "Aquarius",
    positive: ["Friendly", "Future-aware", "Inclusive", "Visionary"],
    negative: ["Detached", "Aloof", "Idealistic", "Crowd-following"],
    tarot: "The Star",
    affirmation: "I belong to something larger than myself.",
    activities: [
      "Reach out to one friend you've drifted from",
      "Show up to a group thing — even briefly",
      "Write one hope down where you can see it",
    ],
  },
  {
    num: 12, roman: "XII", element: "Water",
    title: "Inner sanctuary",
    meaning: "Rest — grief, the unseen, undoing, the unconscious.",
    description:
      "The 12th house is the back room of the soul: dreams, retreats, what's hidden from view, and what quietly undoes you so something new can come through.",
    naturalSign: "Pisces",
    positive: ["Compassionate", "Imaginative", "Mystical", "Restful"],
    negative: ["Escapist", "Self-undermining", "Isolated", "Overwhelmed"],
    tarot: "The Hanged Man",
    affirmation: "Rest is part of becoming, not a delay from it.",
    activities: [
      "Take an unscheduled nap or a long bath",
      "Write a dream down before it fades",
      "Sit quietly with no input for ten minutes",
    ],
  },
];

export const HOUSE_ENTRIES: AlmanacEntry[] = HOUSE_SEEDS.map((h) => ({
  slug: `house-${h.num}`,
  name: `${h.num}${ordinalSuffix(h.num)} House — ${h.title}`,
  glyph: h.roman,
  meaning: h.meaning,
  description: h.description,
  element: h.element,
  elementGlyph: ELEMENT_EMOJI[h.element],
  positive: h.positive,
  negative: h.negative,
  tarot: h.tarot,
  affirmation: h.affirmation,
  activities: h.activities,
  facts: [
    { label: "House", value: `${h.num}${ordinalSuffix(h.num)} (${h.roman})` },
    { label: "Natural sign", value: h.naturalSign },
    { label: "Vibe element", value: `${ELEMENT_EMOJI[h.element]} ${h.element}` },
  ],
}));

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/* -------------------------------------------------------------------------- */
/*  Aspects                                                                   */
/* -------------------------------------------------------------------------- */

interface AspectSeed {
  name: "Conjunction" | "Sextile" | "Square" | "Trine" | "Opposition";
  glyph: string;
  angle: number;
  orb: number;
  /** Vibe element — chosen to match the aspect's feel, not classical. */
  element: Element;
  meaning: string;
  description: string;
  positive: string[];
  negative: string[];
  tarot: string;
  affirmation: string;
  activities: string[];
}

const ASPECT_SEEDS: AspectSeed[] = [
  {
    name: "Conjunction", glyph: "☌", angle: 0, orb: 8, element: "Fire",
    meaning: "Two energies merge — blended, amplified, inseparable.",
    description:
      "A conjunction fuses two planets in the same place. Their themes blur and amplify, for better and worse — you can't easily tell where one ends and the other begins.",
    positive: ["Focused", "Intense", "Unified", "Powerful"],
    negative: ["Blurred", "All-or-nothing", "Compulsive", "Hard to separate"],
    tarot: "The Magician",
    affirmation: "I can hold two truths at once and still act.",
    activities: [
      "Pick one project where these themes overlap and give it 20 focused minutes",
      "Write one sentence naming both energies in plain words",
      "Notice when 'this is one thing' is really two — and choose which to lead with",
    ],
  },
  {
    name: "Sextile", glyph: "⚹", angle: 60, orb: 4, element: "Air",
    meaning: "A friendly opening — small doors, low effort.",
    description:
      "A sextile is a quiet hand on your back: cooperation between two energies that doesn't force itself on you. You have to actually take the small step it offers.",
    positive: ["Helpful", "Curious", "Easy", "Opportunity-shaped"],
    negative: ["Overlooked", "Lazy", "Underused", "Too subtle"],
    tarot: "The Lovers",
    affirmation: "Small yeses are how big doors open.",
    activities: [
      "Send one short message you've been putting off",
      "Say yes to one low-stakes invitation",
      "Try one small new thing — a route, a food, a name",
    ],
  },
  {
    name: "Square", glyph: "□", angle: 90, orb: 6, element: "Fire",
    meaning: "Productive friction — tension that demands action.",
    description:
      "A square is two energies grinding at right angles. It feels stuck or irritating, but the discomfort is the prompt: squares ask you to do something, not just understand.",
    positive: ["Motivating", "Strengthening", "Honest", "Action-forcing"],
    negative: ["Stressful", "Reactive", "Stuck", "Self-defeating"],
    tarot: "The Tower",
    affirmation: "Friction is where I find what I actually want.",
    activities: [
      "Name the tension in one sentence: 'I want X but Y is blocking it'",
      "Take one ten-minute action toward X anyway",
      "Move your body — squares hate sitting still",
    ],
  },
  {
    name: "Trine", glyph: "△", angle: 120, orb: 7, element: "Water",
    meaning: "Easy flow — talents that arrive without effort.",
    description:
      "A trine is two energies in the same element, harmonising naturally. The risk isn't difficulty — it's taking the gift for granted and never doing anything with it.",
    positive: ["Flowing", "Talented", "Lucky", "Generous"],
    negative: ["Lazy", "Taken-for-granted", "Unused", "Complacent"],
    tarot: "The Star",
    affirmation: "I use ease on the things that usually feel hard.",
    activities: [
      "Use the easy mood on a hard task, not a comfortable one",
      "Schedule a difficult conversation into this window",
      "Notice and name one thing that comes naturally to you",
    ],
  },
  {
    name: "Opposition", glyph: "☍", angle: 180, orb: 7, element: "Air",
    meaning: "Across the table — balancing two valid pulls.",
    description:
      "An opposition sets two energies face to face. Other people often carry one side for you, which is why oppositions show up as relationship tension or mirrors.",
    positive: ["Balancing", "Awareness-bringing", "Relational", "Clarifying"],
    negative: ["Polarised", "Projecting", "Tug-of-war", "Either/or"],
    tarot: "Justice",
    affirmation: "Both pulls can be true; I don't have to pick a side.",
    activities: [
      "Write both pulls down side by side without ranking them",
      "Find one action that honours both at 60% instead of one at 100%",
      "Ask: which side am I making someone else carry for me?",
    ],
  },
];

export const ASPECT_ENTRIES: AlmanacEntry[] = ASPECT_SEEDS.map((a) => ({
  slug: `aspect-${a.name.toLowerCase()}`,
  name: a.name,
  glyph: a.glyph,
  meaning: a.meaning,
  description: a.description,
  element: a.element,
  elementGlyph: ELEMENT_EMOJI[a.element],
  positive: a.positive,
  negative: a.negative,
  tarot: a.tarot,
  affirmation: a.affirmation,
  activities: a.activities,
  facts: [
    { label: "Angle", value: `${a.angle}°` },
    { label: "Orb", value: `±${a.orb}°` },
    { label: "Glyph", value: a.glyph },
  ],
}));

/* -------------------------------------------------------------------------- */
/*  Lookup helpers                                                            */
/* -------------------------------------------------------------------------- */

export type AlmanacCategory = "sign" | "planet" | "house" | "aspect";

/** Find an entry across all categories. Slugs are unique across the union. */
export function findAlmanacEntry(
  slug: string,
): { entry: AlmanacEntry; category: AlmanacCategory } | null {
  const s = slug.toLowerCase();
  const sign = SIGN_ENTRIES.find((e) => e.slug === s);
  if (sign) return { entry: sign, category: "sign" };
  const planet = PLANET_ENTRIES.find((e) => e.slug === s);
  if (planet) return { entry: planet, category: "planet" };
  const house = HOUSE_ENTRIES.find((e) => e.slug === s);
  if (house) return { entry: house, category: "house" };
  const aspect = ASPECT_ENTRIES.find((e) => e.slug === s);
  if (aspect) return { entry: aspect, category: "aspect" };
  return null;
}
