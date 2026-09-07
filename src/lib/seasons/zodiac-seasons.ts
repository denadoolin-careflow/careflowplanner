/**
 * Zodiac seasons as a gentle *planning* framework (not horoscopes).
 * Each season gives the month a theme, an overview, a planning focus,
 * a holiday role and an energy — so a family knows when to reset,
 * prepare, celebrate, simplify, rest and transition.
 */

export type ZodiacElement = "fire" | "earth" | "air" | "water";

export type FocusArea =
  | "home" | "family" | "wellbeing" | "money"
  | "food" | "appointments" | "holidays" | "fun" | "rest";

export const FOCUS_LABELS: Record<FocusArea, string> = {
  home: "Home",
  family: "Family",
  wellbeing: "Wellbeing",
  money: "Money",
  food: "Food",
  appointments: "Appointments",
  holidays: "Holidays",
  fun: "Fun",
  rest: "Rest",
};

export type MomCapacity = "light" | "full" | "survival";

export const CAPACITY_META: Record<MomCapacity, { label: string; blurb: string; maxSuggestions: number }> = {
  light: { label: "Light", blurb: "Room to plan ahead and add something extra.", maxSuggestions: 5 },
  full: { label: "Full", blurb: "Keep it to what matters most.", maxSuggestions: 3 },
  survival: { label: "Survival", blurb: "Only the essentials. Everything else can wait.", maxSuggestions: 2 },
};

export interface SeasonIdea {
  title: string;
  focus: FocusArea;
  /** essential ideas survive even in survival mode */
  tier: "essential" | "helpful" | "optional";
}

export interface ZodiacSeason {
  key: string;
  sign: string;
  glyph: string;
  element: ZodiacElement;
  /** inclusive start/end as month (1-12) + day */
  start: { m: number; d: number };
  end: { m: number; d: number };
  theme: string;
  overview: string;
  energy: string;
  planningFocus: string[];
  holidayRole: string;
  ideas: SeasonIdea[];
}

export const ELEMENT_META: Record<ZodiacElement, { label: string; blurb: string; token: string }> = {
  fire: { label: "Fire", blurb: "Momentum, celebration, doing", token: "element-fire" },
  earth: { label: "Earth", blurb: "Steady, practical, building", token: "element-earth" },
  air: { label: "Air", blurb: "Connection, ideas, coordinating", token: "element-air" },
  water: { label: "Water", blurb: "Feeling, rest, tending", token: "element-water" },
};

export const ZODIAC_SEASONS: ZodiacSeason[] = [
  {
    key: "aries", sign: "Aries", glyph: "♈", element: "fire",
    start: { m: 3, d: 21 }, end: { m: 4, d: 19 },
    theme: "Fresh start",
    overview: "The year's first push of energy. A good window to begin things you've been circling and to shake the house awake after winter.",
    energy: "Quick, brave, a little impatient",
    planningFocus: ["Start one new thing", "Spring clean a single room", "Book the appointments you've delayed"],
    holidayRole: "Easter & spring break land here — plan the outing, keep the food simple.",
    ideas: [
      { title: "Book overdue appointments", focus: "appointments", tier: "essential" },
      { title: "Open the windows and reset one room", focus: "home", tier: "helpful" },
      { title: "Pick one goal for the season", focus: "wellbeing", tier: "helpful" },
      { title: "Plan a spring break day out", focus: "fun", tier: "optional" },
    ],
  },
  {
    key: "taurus", sign: "Taurus", glyph: "♉", element: "earth",
    start: { m: 4, d: 20 }, end: { m: 5, d: 20 },
    theme: "Steady comfort",
    overview: "Slow, sensory, grounded. Build the routines and comforts that carry the family through the busy months ahead.",
    energy: "Unhurried and reliable",
    planningFocus: ["Steady the daily rhythm", "Tend the home & garden", "Look at the money picture"],
    holidayRole: "Mother's Day and end-of-school events — book early, keep gifts simple.",
    ideas: [
      { title: "Review the monthly budget", focus: "money", tier: "essential" },
      { title: "Plan Mother's Day", focus: "holidays", tier: "helpful" },
      { title: "Refresh the meal rotation", focus: "food", tier: "helpful" },
      { title: "Plant or tend something", focus: "fun", tier: "optional" },
    ],
  },
  {
    key: "gemini", sign: "Gemini", glyph: "♊", element: "air",
    start: { m: 5, d: 21 }, end: { m: 6, d: 20 },
    theme: "Connect & coordinate",
    overview: "Lots of moving pieces: end of school, calendars colliding, people to reply to. A month for logistics more than big projects.",
    energy: "Busy, social, scattered",
    planningFocus: ["Get the summer calendar on paper", "Catch up on messages", "Confirm camps & childcare"],
    holidayRole: "Graduations, Father's Day and the school-year finish line.",
    ideas: [
      { title: "Map out the summer calendar", focus: "family", tier: "essential" },
      { title: "Confirm camps or summer care", focus: "appointments", tier: "essential" },
      { title: "Plan Father's Day", focus: "holidays", tier: "helpful" },
      { title: "Reply to the people you've missed", focus: "family", tier: "optional" },
    ],
  },
  {
    key: "cancer", sign: "Cancer", glyph: "♋", element: "water",
    start: { m: 6, d: 21 }, end: { m: 7, d: 22 },
    theme: "Home & family",
    overview: "The most tender season. Everyone is home, the days are long, and the work is emotional as much as practical.",
    energy: "Cozy, protective, easily overfull",
    planningFocus: ["Protect a slow rhythm", "Small family traditions", "Guard your own rest"],
    holidayRole: "Independence Day and family visits — host lightly.",
    ideas: [
      { title: "Choose one summer family tradition", focus: "family", tier: "helpful" },
      { title: "Plan the 4th of July simply", focus: "holidays", tier: "helpful" },
      { title: "Block one afternoon for yourself", focus: "rest", tier: "essential" },
      { title: "Print or save summer photos", focus: "fun", tier: "optional" },
    ],
  },
  {
    key: "leo", sign: "Leo", glyph: "♌", element: "fire",
    start: { m: 7, d: 23 }, end: { m: 8, d: 22 },
    theme: "Celebrate & play",
    overview: "Warm, generous, loud. Say yes to the fun things now — the organizing season is right behind it.",
    energy: "Bright and expressive",
    planningFocus: ["Do the summer bucket list", "Celebrate the people you love", "Start the back-to-school runway"],
    holidayRole: "Birthdays and last-hurrah summer plans.",
    ideas: [
      { title: "Finish one bucket-list outing", focus: "fun", tier: "helpful" },
      { title: "Start the back-to-school list", focus: "family", tier: "essential" },
      { title: "Plan the upcoming birthday", focus: "holidays", tier: "helpful" },
      { title: "Have one celebration dinner", focus: "food", tier: "optional" },
    ],
  },
  {
    key: "virgo", sign: "Virgo", glyph: "♍", element: "earth",
    start: { m: 8, d: 23 }, end: { m: 9, d: 22 },
    theme: "Organize & routines",
    overview: "The real new year for families. Systems, schedules, paperwork and health — set them now and autumn runs itself.",
    energy: "Focused, practical, a bit perfectionist",
    planningFocus: ["Rebuild the weekly routine", "School & medical paperwork", "Tidy the systems you use daily"],
    holidayRole: "Back to school; the quiet runway before holiday season.",
    ideas: [
      { title: "Set the school-year weekly rhythm", focus: "family", tier: "essential" },
      { title: "Schedule check-ups and refills", focus: "appointments", tier: "essential" },
      { title: "Reset the paperwork pile", focus: "home", tier: "helpful" },
      { title: "Restock the pantry basics", focus: "food", tier: "optional" },
    ],
  },
  {
    key: "libra", sign: "Libra", glyph: "♎", element: "air",
    start: { m: 9, d: 23 }, end: { m: 10, d: 22 },
    theme: "Balance & harmony",
    overview: "Adjust what September set in motion. Where is the load uneven — at home, in the calendar, between people?",
    energy: "Even, diplomatic, decision-shy",
    planningFocus: ["Rebalance the household load", "Say no to one thing", "Begin holiday thinking, gently"],
    holidayRole: "Quiet prep month: Halloween costumes, holiday budget, gift list.",
    ideas: [
      { title: "Set the holiday budget", focus: "money", tier: "essential" },
      { title: "Sort out Halloween costumes", focus: "holidays", tier: "helpful" },
      { title: "Rebalance one shared chore", focus: "home", tier: "helpful" },
      { title: "Decline one commitment", focus: "rest", tier: "optional" },
    ],
  },
  {
    key: "scorpio", sign: "Scorpio", glyph: "♏", element: "water",
    start: { m: 10, d: 23 }, end: { m: 11, d: 21 },
    theme: "Declutter & depth",
    overview: "Days shorten and things get real. Clear out what you don't want to carry into the holidays — objects, commitments, worries.",
    energy: "Deep, honest, low-light",
    planningFocus: ["Declutter before decorating", "Finish gift shopping early", "Tend grief and hard anniversaries"],
    holidayRole: "Halloween, then the Thanksgiving runway begins in earnest.",
    ideas: [
      { title: "Start the Thanksgiving plan", focus: "holidays", tier: "essential" },
      { title: "Declutter one closet before the decorations", focus: "home", tier: "helpful" },
      { title: "Order gifts that need shipping", focus: "money", tier: "helpful" },
      { title: "Make space for a hard anniversary", focus: "wellbeing", tier: "optional" },
    ],
  },
  {
    key: "sagittarius", sign: "Sagittarius", glyph: "♐", element: "fire",
    start: { m: 11, d: 22 }, end: { m: 12, d: 21 },
    theme: "Gather & go",
    overview: "The most crowded stretch of the year. Travel, hosting, school events. Choose the few things that matter and let the rest go.",
    energy: "Expansive and overcommitted",
    planningFocus: ["Lock travel and hosting plans", "Wrap and ship early", "Pick three traditions, not ten"],
    holidayRole: "Thanksgiving, then the full holiday sprint.",
    ideas: [
      { title: "Confirm travel and hosting details", focus: "family", tier: "essential" },
      { title: "Wrap and ship gifts", focus: "holidays", tier: "essential" },
      { title: "Choose three traditions to keep", focus: "fun", tier: "helpful" },
      { title: "Plan simple weeknight dinners", focus: "food", tier: "optional" },
    ],
  },
  {
    key: "capricorn", sign: "Capricorn", glyph: "♑", element: "earth",
    start: { m: 12, d: 22 }, end: { m: 1, d: 19 },
    theme: "Structure & goals",
    overview: "The holidays end and the year restarts. Quiet, sturdy work: what structure would make next year lighter?",
    energy: "Serious, steady, patient",
    planningFocus: ["Recover from the holidays", "Set the year's few real goals", "Reset finances and paperwork"],
    holidayRole: "Christmas, New Year, then the long put-away.",
    ideas: [
      { title: "Put away holiday decorations", focus: "home", tier: "essential" },
      { title: "Set two goals for the year", focus: "wellbeing", tier: "helpful" },
      { title: "Review bills and subscriptions", focus: "money", tier: "helpful" },
      { title: "Take a genuinely slow weekend", focus: "rest", tier: "optional" },
    ],
  },
  {
    key: "aquarius", sign: "Aquarius", glyph: "♒", element: "air",
    start: { m: 1, d: 20 }, end: { m: 2, d: 18 },
    theme: "Simplify systems",
    overview: "A cool, clear-headed month. Fix the thing that annoys the whole family every single week.",
    energy: "Inventive and detached",
    planningFocus: ["Fix one recurring friction point", "Simplify or automate a chore", "Reconnect with your people"],
    holidayRole: "Valentine's Day and mid-winter school breaks.",
    ideas: [
      { title: "Fix the weekly friction point", focus: "home", tier: "essential" },
      { title: "Simplify one recurring chore", focus: "home", tier: "helpful" },
      { title: "Plan Valentine's Day simply", focus: "holidays", tier: "helpful" },
      { title: "Reach out to a friend", focus: "family", tier: "optional" },
    ],
  },
  {
    key: "pisces", sign: "Pisces", glyph: "♓", element: "water",
    start: { m: 2, d: 19 }, end: { m: 3, d: 20 },
    theme: "Rest & dream",
    overview: "The year's exhale before spring. Lower the bar on purpose, tend your health, and daydream about what's next.",
    energy: "Soft, tired, imaginative",
    planningFocus: ["Rest without guilt", "Tend health quietly", "Dream up the spring plan"],
    holidayRole: "Very little — protect this quiet stretch.",
    ideas: [
      { title: "Protect one true rest day", focus: "rest", tier: "essential" },
      { title: "Do a gentle health check-in", focus: "wellbeing", tier: "helpful" },
      { title: "Sketch the spring plan", focus: "family", tier: "helpful" },
      { title: "Do something creative with the kids", focus: "fun", tier: "optional" },
    ],
  },
];

const md = (m: number, d: number) => m * 100 + d;

/** The zodiac season a date falls in. */
export function seasonForDate(date: Date): ZodiacSeason {
  const key = md(date.getMonth() + 1, date.getDate());
  for (const s of ZODIAC_SEASONS) {
    const a = md(s.start.m, s.start.d);
    const b = md(s.end.m, s.end.d);
    if (a <= b ? key >= a && key <= b : key >= a || key <= b) return s;
  }
  return ZODIAC_SEASONS[0];
}

/** Every zodiac season that touches a given month, in calendar order. */
export function seasonsInMonth(cursor: Date): Array<{ season: ZodiacSeason; from: Date; to: Date }> {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const last = new Date(year, month + 1, 0).getDate();
  const out: Array<{ season: ZodiacSeason; from: Date; to: Date }> = [];
  for (let d = 1; d <= last; d++) {
    const day = new Date(year, month, d);
    const s = seasonForDate(day);
    const prev = out[out.length - 1];
    if (prev && prev.season.key === s.key) prev.to = day;
    else out.push({ season: s, from: day, to: day });
  }
  return out;
}

/** The season that follows the one containing `date`, with its start date. */
export function nextSeasonAfter(date: Date): { season: ZodiacSeason; startsOn: Date } {
  const current = seasonForDate(date);
  const idx = ZODIAC_SEASONS.findIndex(s => s.key === current.key);
  const next = ZODIAC_SEASONS[(idx + 1) % ZODIAC_SEASONS.length];
  let startsOn = new Date(date.getFullYear(), next.start.m - 1, next.start.d);
  if (startsOn <= date) startsOn = new Date(date.getFullYear() + 1, next.start.m - 1, next.start.d);
  return { season: next, startsOn };
}

export function seasonRangeLabel(season: ZodiacSeason): string {
  const fmt = (m: number, d: number) =>
    new Date(2001, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(season.start.m, season.start.d)} – ${fmt(season.end.m, season.end.d)}`;
}
