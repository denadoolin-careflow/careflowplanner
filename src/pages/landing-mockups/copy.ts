export type PhaseKey = "plan" | "grow" | "care" | "letgo";

export const ph = (k: PhaseKey, v: "" | "-tint" | "-deep" = "") => `hsl(var(--rhythm-${k}${v}))`;
export const PHASE_GRADIENT = `linear-gradient(90deg, ${ph("plan")}, ${ph("grow")}, ${ph("care")}, ${ph("letgo")})`;

export const TAGLINE = "Plan ✦ Grow ✦ Care ✦ Let Go";

export const HERO = {
  title: "Life is more than a to-do list.",
  sub: "Find your rhythm. Make space for what matters.",
  body: "Meet CareFlow — an intentional life planner designed to bring your plans, routines, goals, and everyday responsibilities into one peaceful space.",
  body2: "Because a meaningful life isn't about doing more. It's about making room for what matters most.",
  primary: "Join the Waitlist",
  secondary: "Explore CareFlow",
  note: "Less overwhelm. More intention. A life that flows.",
};

export const PROBLEM = {
  title: "You weren't meant to carry it all in your head.",
  body: [
    "The appointments. The endless to-do lists. The meals to plan. The people who need you. The goals you keep putting off.",
    "Life can feel like a hundred moving pieces, and somehow you're expected to hold them all together.",
    "Most productivity tools ask you to do more, move faster, and stay on top of everything.",
  ],
  turn: "CareFlow takes a different approach.",
  question: "What if planning your life felt less like managing a never-ending checklist and more like creating space to breathe?",
};

export const WAY = {
  title: "A softer way to plan. A more intentional way to live.",
  body: "Life isn't linear. Your energy shifts, your priorities evolve, and some days require more care than action. CareFlow helps you move with those changes through four meaningful phases.",
  close: "Four phases. One natural rhythm. Your life, in flow.",
};

export const PHASES: { key: PhaseKey; emoji: string; name: string; lead: string; body: string; note: string; moon: string }[] = [
  { key: "plan", emoji: "🌱", moon: "🌑", name: "Plan", lead: "Create clarity.", body: "Turn scattered thoughts into meaningful intentions. Organize your tasks, projects, schedules, and priorities without the mental clutter.", note: "Make space for what comes next." },
  { key: "grow", emoji: "☀️", moon: "🌓", name: "Grow", lead: "Nurture what matters.", body: "Make progress toward your goals, build supportive habits, and give your ideas room to become something meaningful.", note: "Small steps are still progress." },
  { key: "care", emoji: "🧡", moon: "🌕", name: "Care", lead: "Honor what needs you.", body: "Create rhythms for your wellbeing, your home, and the people you love. Support your responsibilities without forgetting yourself.", note: "You deserve care, too." },
  { key: "letgo", emoji: "🌙", moon: "🌗", name: "Let Go", lead: "Release what no longer serves you.", body: "Reflect, reset, simplify, and make peace with what doesn't need to be carried into tomorrow.", note: "Not everything needs to be done to be enough." },
];

export const FEATURES_TITLE = "Everything in its place. Everything connected.";
export const FEATURES_SUB = "One thoughtful home for the many pieces of your life.";
export const FEATURES: { name: string; body: string; emoji: string; phase: PhaseKey }[] = [
  { emoji: "🌤", phase: "grow", name: "Your Daily Flow", body: "A peaceful dashboard that brings your priorities, routines, upcoming events, and daily intentions together." },
  { emoji: "🗓", phase: "plan", name: "Intentional Planning", body: "Organize your tasks, projects, calendars, and responsibilities around what matters today." },
  { emoji: "🌿", phase: "plan", name: "Goals & Growth", body: "Nurture your dreams, track meaningful progress, and celebrate the little wins along the way." },
  { emoji: "🏡", phase: "care", name: "Home & Family Care", body: "Make everyday living easier with household routines, meal planning, caregiving tools, and shared responsibilities." },
  { emoji: "📓", phase: "letgo", name: "Wellbeing & Reflection", body: "Check in with yourself, track your energy, journal your thoughts, and build rhythms that support your wellbeing." },
  { emoji: "🌙", phase: "letgo", name: "Lunar & Seasonal Living", body: "Reconnect with your natural rhythm through moon phases, seasonal reflections, and intentional guidance." },
];

export const DIFFERENCE = {
  title: "Productivity shouldn't come at the cost of your peace.",
  body: [
    "Traditional planners focus on how much you accomplish.",
    "CareFlow focuses on how intentionally you live.",
    "It's not about filling every hour, checking every box, or creating the perfect routine.",
    "It's about having a place where your plans, your people, your dreams, and your wellbeing can coexist.",
  ],
  close: "Where progress and rest both have a place.",
};

export const WHO = {
  title: "Made for the beautifully full lives we lead.",
  items: [
    "For the parents carrying invisible mental loads.",
    "For the caregivers balancing everyone else's needs with their own.",
    "For the dreamers with a hundred ideas and never enough time.",
    "For the overwhelmed minds craving a little simplicity.",
    "For anyone ready to stop merely managing life and start living it with intention.",
  ],
  close: "You don't need to do it all. You need a rhythm that works for you.",
};

export const PHILOSOPHY = {
  lines: ["Plan with intention.", "Grow with purpose.", "Care with compassion.", "Let go with grace."],
  body: [
    "Some days you'll plan.",
    "Some days you'll make progress.",
    "Some days you'll need to slow down and care for what's in front of you.",
    "And some days, the most meaningful thing you can do is let something go.",
    "Every phase belongs.",
    "Every season matters.",
  ],
  close: "And you are allowed to move at your own pace.",
};

export const FINAL = {
  title: "Make space for the life you want to live.",
  sub: "A calmer mind. A more intentional day. A little less to carry.",
  body: "CareFlow helps you create the space to plan, grow, care, and let go — one day at a time.",
  primary: "Join the Waitlist",
  secondary: "Discover the Four Phases",
  note: "Your life doesn't need to be perfect to find its flow.",
};

export const FOOTER = {
  line: "A more intentional way to plan your life.",
  links: ["Explore", "Our Philosophy", "Features", "Join the Waitlist", "Contact"],
  copy: "© 2026 CareFlow Planner. Made for real life.",
};
