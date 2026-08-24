/**
 * Solar (zodiac) season planning guide.
 *
 * The sun spends roughly a month in each sign. Each of those months carries a
 * distinct planning flavour — what to focus on, which habits land easiest,
 * which chores fit the weather, and what tends to be on the table. This maps a
 * date to its solar season and returns gentle, concrete planning guidance.
 */

export type ZodiacSign =
  | "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo"
  | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";

export type ZodiacElement = "fire" | "earth" | "air" | "water";
export type ZodiacModality = "cardinal" | "fixed" | "mutable";

export interface SolarSeason {
  sign: ZodiacSign;
  label: string;
  glyph: string;
  element: ZodiacElement;
  modality: ZodiacModality;
  /** One-line mood for the month. */
  theme: string;
  /** Two-sentence planning guidance. */
  guidance: string;
  /** Suggested planning focuses / task themes. */
  focus: string[];
  /** Habits that tend to stick during this solar month. */
  habits: string[];
  /** Seasonal meal ideas. */
  meals: string[];
  /** Where the energy naturally goes — used for pacing advice. */
  energy: string;
  /** Start month (1-12) and day of the solar season. */
  startMonth: number;
  startDay: number;
}

export const ELEMENT_LABEL: Record<ZodiacElement, string> = {
  fire: "Fire", earth: "Earth", air: "Air", water: "Water",
};

/** Tailwind token-safe accent classes per element. */
export const ELEMENT_ACCENT: Record<ZodiacElement, string> = {
  fire: "from-orange-400/25 via-amber-300/15 to-transparent",
  earth: "from-emerald-400/25 via-lime-300/15 to-transparent",
  air: "from-sky-400/25 via-cyan-300/15 to-transparent",
  water: "from-indigo-400/25 via-violet-300/15 to-transparent",
};

/** Ordered by the calendar year so lookup can scan backwards. */
export const SOLAR_SEASONS: SolarSeason[] = [
  {
    sign: "capricorn", label: "Capricorn season", glyph: "♑", element: "earth", modality: "cardinal",
    theme: "Quiet ambition and clean foundations",
    guidance: "The year is still dark and slow, which makes it a good month for structure rather than sprinting. Set the frame now — budgets, systems, appointments on the calendar — so the rest of the year has somewhere to land.",
    focus: ["Set the year's anchors", "Budget & bill review", "Paperwork and admin", "Declutter one system"],
    habits: ["Sunday reset", "Early bedtime", "10-minute tidy", "Weekly money check-in"],
    meals: ["Root vegetable roasts", "Slow-cooker stews", "Citrus and greens", "Broth-based soups"],
    energy: "Low and steady — plan fewer, heavier blocks.",
    startMonth: 12, startDay: 22,
  },
  {
    sign: "aquarius", label: "Aquarius season", glyph: "♒", element: "air", modality: "fixed",
    theme: "Rethinking what no longer fits",
    guidance: "Aquarius season likes experiments more than routines. Pick one part of your week that feels stale and try a different shape for a few weeks before deciding.",
    focus: ["Try a new routine shape", "Community & friendships", "Automate a repeat chore", "Digital declutter"],
    habits: ["One new experiment a week", "Screen-time boundary", "Message a friend", "Learn something small"],
    meals: ["Big-batch grain bowls", "Freezer meal prep", "Something you've never cooked", "Winter salads"],
    energy: "Mental and scattered — protect focus blocks.",
    startMonth: 1, startDay: 20,
  },
  {
    sign: "pisces", label: "Pisces season", glyph: "♓", element: "water", modality: "mutable",
    theme: "Rest, softness, and letting things blur",
    guidance: "Energy runs low and dreamy here, so an over-packed plan will just create guilt. Leave white space, keep the must-dos short, and let rest be a scheduled item.",
    focus: ["Lighter task load", "Rest and recovery", "Creative or journaling time", "Close out loose ends"],
    habits: ["Evening wind-down", "Journaling", "Gentle movement", "Screens off early"],
    meals: ["Soups and congee", "Fish and citrus", "Herbal teas", "Simple comfort plates"],
    energy: "Soft and tired — halve your normal capacity.",
    startMonth: 2, startDay: 19,
  },
  {
    sign: "aries", label: "Aries season", glyph: "♈", element: "fire", modality: "cardinal",
    theme: "Fresh starts and first moves",
    guidance: "This is the natural new year — momentum is easier to find than to sustain. Start the thing you've been circling, but pick only one or two so the spark doesn't scatter.",
    focus: ["Start one bold project", "Spring cleaning kickoff", "Movement goals", "Clear the backlog"],
    habits: ["Morning walk", "Workout streak", "Daily top-3", "5-minute start rule"],
    meals: ["Spring greens", "Quick high-protein meals", "Grilled anything", "Fresh herbs"],
    energy: "High and impulsive — front-load the hard tasks.",
    startMonth: 3, startDay: 21,
  },
  {
    sign: "taurus", label: "Taurus season", glyph: "♉", element: "earth", modality: "fixed",
    theme: "Comfort, steadiness, and small pleasures",
    guidance: "Taurus season rewards consistency over intensity. Turn last month's bursts into repeatable routines and make the spaces you live in feel good.",
    focus: ["Turn starts into routines", "Home comfort projects", "Garden or plants", "Savings and stability"],
    habits: ["Same wake time", "Cook at home", "Daily stretch", "Tidy one surface"],
    meals: ["Farmers market produce", "Baked goods", "Asparagus and peas", "Slow weekend breakfasts"],
    energy: "Steady and grounded — good for long blocks.",
    startMonth: 4, startDay: 20,
  },
  {
    sign: "gemini", label: "Gemini season", glyph: "♊", element: "air", modality: "mutable",
    theme: "Curiosity, errands, and many small threads",
    guidance: "Attention moves quickly this month, so batch small tasks instead of fighting for deep focus. Errand runs, calls, and catching up on messages go faster than usual.",
    focus: ["Errand batching", "Calls and follow-ups", "Learning something new", "Short outings"],
    habits: ["Inbox zero once a week", "Read 10 pages", "Daily brain dump", "Call someone back"],
    meals: ["Snack plates", "Wraps and sandwiches", "Anything shareable", "Cold noodle bowls"],
    energy: "Quick but shallow — plan short, varied blocks.",
    startMonth: 5, startDay: 21,
  },
  {
    sign: "cancer", label: "Cancer season", glyph: "♋", element: "water", modality: "cardinal",
    theme: "Home, family, and being fed well",
    guidance: "The focus turns inward toward home and the people in it. Plan around family rhythms and caregiving, and let the outside world's to-do list be lighter.",
    focus: ["Family time and traditions", "Home projects", "Caregiving check-ins", "Memory keeping"],
    habits: ["Family dinner", "Photo of the day", "Check in on someone", "Evening tidy together"],
    meals: ["Comfort classics", "Summer fruit", "Family-style dinners", "Anything from a recipe you inherited"],
    energy: "Tidal — expect good days and flat days.",
    startMonth: 6, startDay: 21,
  },
  {
    sign: "leo", label: "Leo season", glyph: "♌", element: "fire", modality: "fixed",
    theme: "Play, celebration, and being seen",
    guidance: "Put the fun on the calendar first this month — it's the season most likely to be remembered. Keep obligations trimmed so there's room for spontaneity.",
    focus: ["Plan celebrations", "Summer bucket list", "Creative projects", "Photos and documenting"],
    habits: ["One joyful thing daily", "Get outside", "Creative hour", "Celebrate small wins"],
    meals: ["Grilling and picnics", "Stone fruit", "Ice cream nights", "Big colorful salads"],
    energy: "Warm and expressive — schedule the fun first.",
    startMonth: 7, startDay: 22,
  },
  {
    sign: "virgo", label: "Virgo season", glyph: "♍", element: "earth", modality: "mutable",
    theme: "Systems, health, and getting sorted",
    guidance: "This is the back-to-school reset even if no one in the house is in school. Rebuild routines, tighten the meal plan, and fix the small things that have been annoying you.",
    focus: ["Routine rebuild", "Health appointments", "Meal planning", "Pantry & closet reset"],
    habits: ["Meal prep day", "Daily review", "Vitamins and water", "Weekly deep clean"],
    meals: ["Late tomatoes and corn", "Prepped lunches", "Simple whole foods", "Batch soups for the freezer"],
    energy: "Focused and detailed — great for admin sprints.",
    startMonth: 8, startDay: 23,
  },
  {
    sign: "libra", label: "Libra season", glyph: "♎", element: "air", modality: "cardinal",
    theme: "Balance, beauty, and relationships",
    guidance: "Look at where the load is uneven — between people, between work and rest. Rebalance the calendar rather than adding to it, and make time for the relationships that got squeezed out.",
    focus: ["Rebalance the mental load", "Date and friend time", "Home aesthetics", "Say no to one thing"],
    habits: ["Shared chore check-in", "Weekly date or call", "Make one space pretty", "Gratitude note"],
    meals: ["Apples and squash", "Shared platters", "Cozy dinners for two", "First soups of fall"],
    energy: "Even but people-heavy — guard solo time.",
    startMonth: 9, startDay: 23,
  },
  {
    sign: "scorpio", label: "Scorpio season", glyph: "♏", element: "water", modality: "fixed",
    theme: "Depth, honesty, and clearing out",
    guidance: "Good month for the tasks you've been avoiding — the hard conversation, the messy drawer, the finances. Do them in small doses with rest on either side.",
    focus: ["Tackle the avoided task", "Deep declutter", "Financial review", "Hard conversations"],
    habits: ["One avoided thing a week", "Journaling", "Early night", "Digital cleanup"],
    meals: ["Roasted roots", "Rich stews", "Dark chocolate", "Warming spices"],
    energy: "Intense in bursts — alternate hard and light days.",
    startMonth: 10, startDay: 23,
  },
  {
    sign: "sagittarius", label: "Sagittarius season", glyph: "♐", element: "fire", modality: "mutable",
    theme: "Perspective, plans, and gathering",
    guidance: "The calendar fills fast this month, so decide early what actually matters and protect it. Book travel and holiday logistics before the last two weeks disappear.",
    focus: ["Holiday logistics", "Travel planning", "Gift list", "Year-ahead vision"],
    habits: ["Weekly planning session", "Move your body outdoors", "Write down one hope", "Say yes to one gathering"],
    meals: ["Holiday baking", "Big-pot meals", "Warming drinks", "Something from elsewhere"],
    energy: "Optimistic but over-committing — leave buffer.",
    startMonth: 11, startDay: 22,
  },
];

const SEASON_BY_SIGN = Object.fromEntries(SOLAR_SEASONS.map(s => [s.sign, s])) as Record<ZodiacSign, SolarSeason>;

export function solarSeasonBySign(sign: ZodiacSign): SolarSeason {
  return SEASON_BY_SIGN[sign];
}

/** The solar season active on a given date. */
export function solarSeasonFor(date: Date = new Date()): SolarSeason {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // Scan in calendar order and keep the last season that has already started.
  // Capricorn (Dec 22) wraps, so it is also the fallback for early January.
  let current = SOLAR_SEASONS[0]; // capricorn
  for (const s of SOLAR_SEASONS) {
    if (s.startMonth === 12) continue;
    if (m > s.startMonth || (m === s.startMonth && d >= s.startDay)) current = s;
  }
  if (m === 12 && d >= 22) current = SOLAR_SEASONS[0];
  return current;
}

/** The season that follows the given one. */
export function nextSolarSeason(season: SolarSeason): SolarSeason {
  const order = SOLAR_SEASONS.slice().sort((a, b) => a.startMonth - b.startMonth || a.startDay - b.startDay);
  const i = order.findIndex(s => s.sign === season.sign);
  return order[(i + 1) % order.length];
}

/** Days until the current solar season hands over to the next. */
export function daysLeftInSolarSeason(date: Date = new Date()): { days: number; next: SolarSeason; nextDate: Date } {
  const next = nextSolarSeason(solarSeasonFor(date));
  const y = date.getFullYear();
  let nextDate = new Date(y, next.startMonth - 1, next.startDay);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (nextDate <= today) nextDate = new Date(y + 1, next.startMonth - 1, next.startDay);
  return { days: Math.round((nextDate.getTime() - today.getTime()) / 86400000), next, nextDate };
}
