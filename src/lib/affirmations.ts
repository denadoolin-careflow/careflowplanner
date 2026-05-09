export const AFFIRMATIONS = [
  "One small thing done is still done.",
  "You're allowed to take up space today.",
  "That's one less thing for tomorrow-you.",
  "Done is gentler than perfect.",
  "You showed up. That counts.",
  "Tiny progress is still progress.",
  "Soft and steady wins the day.",
  "You don't have to do it all to do enough.",
  "Look at you, finishing things.",
  "The list is shorter because of you.",
  "Breathe in. That one's behind you now.",
  "You're doing more than anyone sees.",
  "Care is also a kind of work — and you did it.",
  "Slow is a perfectly good speed.",
  "Even small wins deserve a quiet cheer.",
];

export function pickAffirmation() {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}