/**
 * Twelve-house titles, themes, and life-area chips. Used by the Houses tab
 * and the Active Houses panel in the Cosmic Flow dashboard.
 */
export interface HouseTheme {
  num: number;
  title: string;
  blurb: string;
  focus: string[];
}

export const HOUSE_THEMES: HouseTheme[] = [
  { num: 1,  title: "Identity & Appearance",   blurb: "Self, body, first impressions.",      focus: ["self", "vitality", "presence"] },
  { num: 2,  title: "Money & Resources",       blurb: "What you value and what sustains you.", focus: ["income", "values", "self-worth"] },
  { num: 3,  title: "Learning & Communication",blurb: "Daily talk, siblings, short trips.",  focus: ["messages", "study", "neighborhood"] },
  { num: 4,  title: "Home & Family",           blurb: "Roots, household, emotional ground.", focus: ["home", "family", "roots"] },
  { num: 5,  title: "Creativity & Play",       blurb: "Joy, romance, creative expression.",  focus: ["play", "creativity", "romance"] },
  { num: 6,  title: "Work & Wellbeing",        blurb: "Routines, service, daily care.",      focus: ["routine", "health", "service"] },
  { num: 7,  title: "Partnership",             blurb: "One-to-one bonds and contracts.",     focus: ["partners", "contracts", "mirroring"] },
  { num: 8,  title: "Shared Depths",           blurb: "Intimacy, shared resources, change.", focus: ["intimacy", "shared money", "transformation"] },
  { num: 9,  title: "Vision & Meaning",        blurb: "Travel, study, belief, the bigger view.", focus: ["travel", "belief", "publishing"] },
  { num: 10, title: "Calling & Reputation",    blurb: "Public role, career, legacy.",        focus: ["career", "calling", "authority"] },
  { num: 11, title: "Community & Hopes",       blurb: "Friends, networks, dreams ahead.",    focus: ["friends", "groups", "hopes"] },
  { num: 12, title: "Quiet & Release",         blurb: "Rest, retreat, the inner sky.",       focus: ["rest", "retreat", "inner work"] },
];

export function houseTheme(num: number): HouseTheme {
  return HOUSE_THEMES[Math.max(0, Math.min(11, num - 1))];
}