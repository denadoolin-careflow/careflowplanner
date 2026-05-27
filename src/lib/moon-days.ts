/**
 * Lunar-day (Tithi-inspired) meanings — 30 days of the synodic cycle.
 * Day 1 = new moon, ~Day 15 = full, Day 30 = balsamic / very dark.
 * Ported from the Lunar Life project.
 */
import { getMoonAgeDays } from "@/lib/moon";

export interface MoonDayMeaning {
  day: number;
  title: string;
  meaning: string;
  invitation: string;
}

export const MOON_DAYS: MoonDayMeaning[] = [
  { day: 1,  title: "Seed",         meaning: "A blank page. Intentions whispered now travel quietly into the cycle.", invitation: "Name one quiet wish — write it small." },
  { day: 2,  title: "Stirring",     meaning: "Something underground begins to turn toward light.",                     invitation: "Notice one tiny pull of curiosity." },
  { day: 3,  title: "First breath", meaning: "A fragile yes. Protect it from too much opinion.",                       invitation: "Keep your idea to yourself for one more day." },
  { day: 4,  title: "Foundation",   meaning: "Choose the ground you want to build on, not the ceiling you want to reach.", invitation: "Tend one small basic — water, light, rest." },
  { day: 5,  title: "Curiosity",    meaning: "A day for questions, not answers.",                                       invitation: "Ask one open question and let it linger." },
  { day: 6,  title: "Practice",     meaning: "Repetition is how the seed becomes a stem.",                              invitation: "Repeat one small kind act from yesterday." },
  { day: 7,  title: "Threshold",    meaning: "First friction. The path asks: do you still want this?",                  invitation: "Choose one thing to keep — release the rest for today." },
  { day: 8,  title: "Effort",       meaning: "Honest work. Soft persistence beats force.",                              invitation: "Move your body for three slow minutes." },
  { day: 9,  title: "Refinement",   meaning: "Small adjustments matter more than big restarts.",                        invitation: "Change one detail — don't redo." },
  { day: 10, title: "Steadying",    meaning: "The shape is forming. Trust what's working.",                             invitation: "Notice one thing that is already going well." },
  { day: 11, title: "Almost",       meaning: "Close, not done. Patience is the practice.",                              invitation: "Step away from a screen for five minutes." },
  { day: 12, title: "Tending",      meaning: "Care, not effort, is the verb today.",                                    invitation: "Eat one meal slowly." },
  { day: 13, title: "Anticipation", meaning: "The light is gathering. Let yourself feel quietly excited.",              invitation: "Write two lines about what you're learning." },
  { day: 14, title: "Brink",        meaning: "Fullness is near. Soften the urge to finish everything tonight.",         invitation: "Drink water and stretch your back." },
  { day: 15, title: "Fullness",     meaning: "Everything is illuminated — the bright and the tender both.",             invitation: "Name one feeling without fixing it." },
  { day: 16, title: "Witness",      meaning: "What the full light revealed asks to be acknowledged, not rushed.",       invitation: "Tell someone (or yourself) one true thing." },
  { day: 17, title: "Gratitude",    meaning: "The light begins to soften. Notice what you've been given.",              invitation: "Whisper one quiet thank-you." },
  { day: 18, title: "Sharing",      meaning: "What you've gathered is meant to move outward, gently.",                  invitation: "Send one small kind message." },
  { day: 19, title: "Integration",  meaning: "Lessons are settling into the body, not just the mind.",                  invitation: "Take three slow breaths between tasks." },
  { day: 20, title: "Letting be",   meaning: "Some things finish themselves if you stop interrupting.",                 invitation: "Leave one small thing unfinished, on purpose." },
  { day: 21, title: "Editing",      meaning: "Time to put something down — not all of it, just one weight.",            invitation: "Release one task, expectation, or thought." },
  { day: 22, title: "Honesty",      meaning: "What's actually true today? The answer is allowed to be small.",          invitation: "Write one honest sentence in your journal." },
  { day: 23, title: "Composting",   meaning: "Even what didn't work becomes soil for the next cycle.",                  invitation: "Name one thing you tried that taught you something." },
  { day: 24, title: "Slowing",      meaning: "Your body is asking for a softer pace.",                                   invitation: "Slow down once today, on purpose." },
  { day: 25, title: "Quiet",        meaning: "Less input. The world keeps turning without your full attention.",         invitation: "Put your phone down for five minutes." },
  { day: 26, title: "Repair",       meaning: "Small mendings — a meal, a nap, a glass of water — are the work now.",     invitation: "Eat or drink something warm." },
  { day: 27, title: "Surrender",    meaning: "You don't have to solve it tonight. You just have to rest.",               invitation: "Lie down for five minutes." },
  { day: 28, title: "Hush",         meaning: "The world goes quiet before it begins again.",                             invitation: "Light a candle or dim a light." },
  { day: 29, title: "Threshold",    meaning: "One foot in this cycle, one foot in the next. Honor the in-between.",      invitation: "Write one line: 'What I'm leaving behind is ___'" },
  { day: 30, title: "Dark seed",    meaning: "The deepest dark holds the next beginning. Trust it.",                     invitation: "Whisper: 'rest counts.'" },
];

export function getMoonDayNumber(date: Date = new Date()): number {
  const age = getMoonAgeDays(date);
  const day = Math.floor(age) + 1;
  return Math.max(1, Math.min(30, day));
}

export function getMoonDayMeaning(date: Date = new Date()): MoonDayMeaning {
  const day = getMoonDayNumber(date);
  return MOON_DAYS.find((m) => m.day === day) ?? MOON_DAYS[0];
}