import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export type PhaseSignGuide = { line: string; actions: [string, string, string]; affirmation: string };

/** What each Moon sign rules, used as a short subtitle. */
export const SIGN_BRIEF: Record<string, string> = {
  Aries: "Fire · courage, starts, the body's drive",
  Taurus: "Earth · money, comfort, the senses",
  Gemini: "Air · messages, errands, siblings and neighbors",
  Cancer: "Water · home, family, emotional safety",
  Leo: "Fire · joy, creativity, being seen",
  Virgo: "Earth · health routines, details, useful work",
  Libra: "Air · partnerships, fairness, beauty",
  Scorpio: "Water · shared money, trust, what's hidden",
  Sagittarius: "Fire · learning, travel, meaning",
  Capricorn: "Earth · career, structure, long-term plans",
  Aquarius: "Air · friends, community, new systems",
  Pisces: "Water · rest, intuition, compassion",
};

type Row = Record<string, PhaseSignGuide>;
const g = (line: string, a: string, b: string, c: string, affirmation: string): PhaseSignGuide => ({ line, actions: [a, b, c], affirmation });

export const PHASE_SIGN_GUIDE: Record<RhythmPhase, Row> = {
  plan: {
    Aries: g("Aries seeds fast starts: name the one bold thing you've been postponing and book its first 20 minutes.", "Pick a start date for a stalled goal", "Write a 3-word battle cry", "Move your body before planning", "I'm allowed to begin before I feel ready."),
    Taurus: g("Taurus plants slow, lasting seeds: set a money or comfort intention you can sustain for months.", "Set one savings or spending goal", "Plan a nourishing weekly meal", "Clear a cozy planning spot", "Slow and steady is still moving."),
    Gemini: g("Gemini favors lists and conversations: brainstorm on paper, then text one person about your idea.", "Brain-dump every open loop", "Schedule one catch-up call", "Choose one book or class to start", "Curiosity is a good compass."),
    Cancer: g("Cancer intentions start at home: decide what would make your household feel safer and calmer this month.", "Plan one family or care routine", "Stock the pantry list", "Ask what your heart needs most", "My home can hold me."),
    Leo: g("Leo seeds visible, joyful goals: choose a creative project you'd be proud to share.", "Name one creative project", "Block time for play this week", "Tell someone your intention out loud", "My light is welcome here."),
    Virgo: g("Virgo plans in details: design a small daily routine for health or work and write the exact steps.", "Draft a 3-step morning routine", "Book an overdue health appointment", "Set up one checklist", "Small systems carry big loads."),
    Libra: g("Libra sets intentions in pairs: agree on a shared plan with a partner, friend or co-caregiver.", "Plan one shared commitment", "Balance this week's calendar", "Pick one beauty touch for home", "Fair is kinder than perfect."),
    Scorpio: g("Scorpio plants deep: commit privately to the change you rarely admit you want.", "Write the intention you'd keep secret", "Review shared bills or debts", "Pick one habit to quit", "Depth is where my power lives."),
    Sagittarius: g("Sagittarius aims far: set a learning or travel goal and map the first practical step.", "Choose a skill to study", "Price out a future trip", "Write your 'why' for this season", "There is more out there for me."),
    Capricorn: g("Capricorn builds foundations: set one measurable career or long-term goal with a deadline.", "Set one dated milestone", "Outline a 4-week plan", "Update your budget or résumé", "I build things that last."),
    Aquarius: g("Aquarius rethinks systems: design a new way of doing an old chore, and invite your people in.", "Redesign one clunky routine", "Plan a group or community date", "Try one new app or tool", "Different can be better."),
    Pisces: g("Pisces dreams first: let an intention arrive through rest, music or a quiet walk, then write it down.", "Journal a dream or daydream", "Create a gentle vision board", "Schedule real rest this week", "My intuition is information."),
  },
  grow: {
    Aries: g("Aries momentum: tackle the hardest task first, in a short sprint, while energy runs high.", "Do a 25-minute sprint", "Make the call you've avoided", "Get a sweaty workout in", "Action clears the fog."),
    Taurus: g("Taurus growth is cumulative: repeat yesterday's good habit and add one small upgrade.", "Keep a habit streak alive", "Add to savings, even $5", "Cook a batch meal", "Consistency is my superpower."),
    Gemini: g("Gemini grows through words: send the emails, post the update, ask the question.", "Clear your message backlog", "Share progress with someone", "Run errands in one loop", "Speaking it makes it real."),
    Cancer: g("Cancer grows by nurturing: feed the project the same way you'd feed someone you love.", "Batch-prep family meals", "Check in on a loved one", "Add comfort to your workspace", "Caring is productive."),
    Leo: g("Leo builds confidence: show your work-in-progress and let encouragement fuel you.", "Share a draft or photo", "Practice a creative skill", "Wear something that feels like you", "I'm proud of what I'm making."),
    Virgo: g("Virgo refines: fix the small errors and tighten your process while momentum holds.", "Edit or proof one piece of work", "Organize one drawer or folder", "Track water, sleep or steps", "Better is enough; perfect can wait."),
    Libra: g("Libra grows through cooperation: trade help, delegate a piece, or co-work with someone.", "Delegate one task", "Co-work or body-double for an hour", "Negotiate a fairer split", "Shared work is lighter work."),
    Scorpio: g("Scorpio focus: go all-in on one priority and silence distractions for a deep work block.", "Turn off notifications for 90 minutes", "Research something fully", "Tackle one financial task", "I can go all the way in."),
    Sagittarius: g("Sagittarius expands: stretch beyond comfort with a new class, route or conversation.", "Take a lesson or watch a lecture", "Walk somewhere new", "Say yes to an invitation", "Growth lives past my comfort zone."),
    Capricorn: g("Capricorn climbs: push a work milestone forward and protect your focused hours.", "Finish one milestone task", "Block focus time on the calendar", "Review progress against your plan", "Discipline is a form of self-respect."),
    Aquarius: g("Aquarius grows together: test your new system and gather feedback from friends.", "Test-drive a new routine", "Ask a friend for input", "Join a group or forum", "My ideas grow in community."),
    Pisces: g("Pisces grows quietly: let creativity and compassion lead, and work in flowing, gentle stretches.", "Make art, music or writing", "Volunteer or help someone", "Take a restorative bath or nap", "Gentle effort still counts."),
  },
  care: {
    Aries: g("Aries at full light: release pent-up tension through movement before it turns into irritation.", "Take a brisk walk or dance", "Speak up kindly about one frustration", "Celebrate a recent win", "My fire deserves a safe outlet."),
    Taurus: g("Taurus care is sensory: tend your body with good food, touch and a calm, beautiful space.", "Cook a slow, nourishing meal", "Stretch or get a massage", "Tidy and scent your bedroom", "I deserve comfort."),
    Gemini: g("Gemini care: the full light reveals mixed messages, so clarify one misunderstanding today.", "Clarify one plan by text", "Write a gratitude list", "Read for pleasure", "Clear words are a kindness."),
    Cancer: g("Cancer care is emotional: feelings run high, so make space for tears, hugs and home time.", "Call family or your care circle", "Make a comfort dish", "Let yourself feel without fixing", "My feelings are welcome here."),
    Leo: g("Leo care is celebration: honor what you've created and let others cheer you on.", "Host or join a small gathering", "Thank someone publicly", "Admire your progress out loud", "I'm worth celebrating."),
    Virgo: g("Virgo care is practical: tend health, refill meds and simplify tomorrow's to-do list.", "Refill prescriptions or supplements", "Clean one high-use area", "Trim tomorrow's list by half", "Taking care of details is self-care."),
    Libra: g("Libra care is relational: notice who's carrying more and rebalance gently.", "Have one honest relationship check-in", "Rebalance chores or caregiving", "Add beauty: flowers, music, candles", "Balance is something I can restore."),
    Scorpio: g("Scorpio care goes deep: name the emotion under the surface and share it with someone you trust.", "Journal what you're really feeling", "Have one honest conversation", "Protect your energy with a boundary", "Truth heals me."),
    Sagittarius: g("Sagittarius care is perspective: step outside, laugh, and remember the bigger picture.", "Spend time in nature", "Watch something funny", "Reflect on what you've learned", "Joy is part of my care."),
    Capricorn: g("Capricorn care: honor your responsibilities and admit where you need support.", "Ask for help with one duty", "Review your commitments", "Rest your shoulders and jaw", "Strong people rest too."),
    Aquarius: g("Aquarius care: connect with your community and give or receive support freely.", "Message a friend group", "Offer help to a neighbor", "Unplug from news for an evening", "I belong to my people."),
    Pisces: g("Pisces care is soul-deep: protect your energy, soak in water, and listen to intuition.", "Take a warm bath or shower ritual", "Meditate for ten minutes", "Limit draining contact today", "Softness is strength."),
  },
  letgo: {
    Aries: g("Aries release: drop the projects you started in a rush and no longer believe in.", "Cancel one rushed commitment", "Burn off stress with exercise", "Forgive yourself for impatience", "Stopping can be brave."),
    Taurus: g("Taurus release: loosen your grip on stuff and spending that weigh more than they give.", "Donate one bag of items", "Cancel an unused subscription", "Rest your body without guilt", "I have enough."),
    Gemini: g("Gemini release: clear mental clutter by closing tabs, deleting old notes and unsubscribing.", "Unsubscribe from five emails", "Close every open tab", "Archive old notes and chats", "A quiet mind has room."),
    Cancer: g("Cancer release: let old family patterns and worries soften; you don't have to carry everyone.", "Write down one worry and set it aside", "Clear the fridge or pantry", "Say no to one obligation", "I can love without carrying it all."),
    Leo: g("Leo release: let go of needing applause and rest out of the spotlight.", "Take a social media break", "Finish or shelve a creative project", "Do something just for you", "I'm enough without an audience."),
    Virgo: g("Virgo release: drop perfectionism and the to-dos that were never really yours.", "Delete three nonessential tasks", "Declutter the bathroom cabinet", "Leave one thing imperfect on purpose", "Done is kinder than perfect."),
    Libra: g("Libra release: end the people-pleasing and return what isn't yours to hold.", "Hand back a borrowed responsibility", "Clear surfaces in a shared room", "Let one disagreement rest", "I don't have to keep the peace alone."),
    Scorpio: g("Scorpio release: let a grudge, secret or old fear die so something new can grow.", "Write a letter you won't send", "Shred old paperwork", "Forgive one old hurt", "What ends makes room."),
    Sagittarius: g("Sagittarius release: drop beliefs and plans that have become too small for you.", "Retire an outdated goal", "Clear your travel or study clutter", "Rest from advice and opinions", "I'm free to change my mind."),
    Capricorn: g("Capricorn release: step back from overwork and loosen rigid rules you made for yourself.", "Log off on time tonight", "Drop one 'should' from your list", "Review and close finished projects", "Rest is part of the plan."),
    Aquarius: g("Aquarius release: detach from groups, feeds and routines that drain more than they connect.", "Leave one draining group chat", "Mute noisy accounts", "Reset a broken system", "I choose where my energy goes."),
    Pisces: g("Pisces release: surrender to rest, sleep long and let the cycle close in quiet.", "Go to bed early", "Do a guided release meditation", "Let tears or music move through you", "I can float for a while."),
  },
};

const PHASE_FALLBACK: Record<RhythmPhase, PhaseSignGuide> = {
  plan: g("Set one clear intention for this cycle.", "Write one intention", "Pick a first step", "Sketch the week", "Beginnings are gentle."),
  grow: g("Take one steady step forward.", "Do one focused block", "Keep a habit going", "Share progress", "Momentum builds."),
  care: g("Tend to people, home and yourself.", "Check in with someone", "Rest your body", "Celebrate a win", "Care is enough."),
  letgo: g("Clear what's finished and rest.", "Close old tasks", "Declutter one corner", "Rest early", "Rest is part of the work."),
};

export function phaseSignGuide(phase: RhythmPhase, sign?: string | null): PhaseSignGuide {
  return (sign && PHASE_SIGN_GUIDE[phase]?.[sign]) || PHASE_FALLBACK[phase];
}
