export type TarotSuit = "Wands" | "Cups" | "Swords" | "Pentacles";
export type TarotArcana = "Major" | "Minor";
export type TarotOrientation = "upright" | "reversed";

export interface TarotCard {
  id: string;
  name: string;
  arcana: TarotArcana;
  suit?: TarotSuit;
  number?: number; // 0-21 majors, 1-14 minors (11=Page,12=Knight,13=Queen,14=King)
  glyph: string;   // emoji or unicode glyph
  keywords: string[];
  upright: string;
  reversed: string;
}

const MAJOR: TarotCard[] = [
  { id: "m-0",  number: 0,  name: "The Fool",            arcana: "Major", glyph: "🎒", keywords: ["beginnings","trust","leap"],            upright: "A fresh start. Step out without needing all the answers.",            reversed: "Hesitation or recklessness. Look before the leap, but don't freeze." },
  { id: "m-1",  number: 1,  name: "The Magician",        arcana: "Major", glyph: "✨", keywords: ["focus","tools","manifest"],             upright: "You have what you need. Channel attention into one thing.",           reversed: "Scattered focus. Misused energy. Return to your one true thing." },
  { id: "m-2",  number: 2,  name: "The High Priestess",  arcana: "Major", glyph: "🌙", keywords: ["intuition","quiet","inner knowing"],    upright: "Listen inward before deciding. Stillness is information.",             reversed: "You're ignoring an inner whisper. Get quiet enough to hear it." },
  { id: "m-3",  number: 3,  name: "The Empress",         arcana: "Major", glyph: "🌸", keywords: ["nurture","growth","softness"],          upright: "Tend to what you love — including yourself.",                          reversed: "Pouring out without refilling. Tend the gardener too." },
  { id: "m-4",  number: 4,  name: "The Emperor",         arcana: "Major", glyph: "🏛️", keywords: ["structure","steadiness","boundary"],   upright: "Build a small structure that holds you. Boundaries are care.",         reversed: "Rigidity or collapse of structure. Soften the rules a little." },
  { id: "m-5",  number: 5,  name: "The Hierophant",      arcana: "Major", glyph: "📜", keywords: ["tradition","teacher","ritual"],         upright: "Borrow from a tradition that grounds you, then make it yours.",        reversed: "Question what you inherited. Not every old rule is yours to keep." },
  { id: "m-6",  number: 6,  name: "The Lovers",          arcana: "Major", glyph: "💞", keywords: ["choice","alignment","union"],           upright: "Choose what aligns with your values, even quietly.",                   reversed: "Misalignment. A choice was made out of fear — revisit it gently." },
  { id: "m-7",  number: 7,  name: "The Chariot",         arcana: "Major", glyph: "🛞", keywords: ["will","direction","momentum"],          upright: "Pick a direction. Movement clears the fog.",                           reversed: "Spinning without a steering hand. Pause, choose, then drive." },
  { id: "m-8",  number: 8,  name: "Strength",            arcana: "Major", glyph: "🦁", keywords: ["gentleness","courage","patience"],      upright: "Soft strength. Meet the hard thing without forcing.",                  reversed: "Self-doubt or forcing. Trade willpower for tenderness today." },
  { id: "m-9",  number: 9,  name: "The Hermit",          arcana: "Major", glyph: "🕯️", keywords: ["solitude","reflection","light"],       upright: "Withdraw a little. Your own lantern is enough.",                       reversed: "Isolation has tipped past helpful. Let one trusted voice in." },
  { id: "m-10", number: 10, name: "Wheel of Fortune",    arcana: "Major", glyph: "🎡", keywords: ["cycles","change","timing"],             upright: "Things turn. Your job is to stay with the turning.",                   reversed: "Resistance to change. The wheel turns whether you brace or breathe." },
  { id: "m-11", number: 11, name: "Justice",             arcana: "Major", glyph: "⚖️", keywords: ["truth","balance","accountability"],    upright: "Tell yourself the truth gently. Balance follows honesty.",             reversed: "An imbalance you keep avoiding. Own your part, kindly." },
  { id: "m-12", number: 12, name: "The Hanged One",      arcana: "Major", glyph: "🙃", keywords: ["pause","perspective","surrender"],      upright: "Pause on purpose. A new view is waiting.",                             reversed: "Stuck in the pause. The shift you're avoiding is the next move." },
  { id: "m-13", number: 13, name: "Death",               arcana: "Major", glyph: "🦋", keywords: ["ending","transformation","release"],    upright: "Something is complete. Let it be over so the next can arrive.",        reversed: "Clinging to what's already gone. Loosen one finger at a time." },
  { id: "m-14", number: 14, name: "Temperance",          arcana: "Major", glyph: "🍵", keywords: ["blend","moderation","care"],            upright: "Mix the right amounts. Slow, careful integration.",                    reversed: "Extremes pulling at you. Return to the middle path." },
  { id: "m-15", number: 15, name: "The Devil",           arcana: "Major", glyph: "⛓️", keywords: ["attachment","habit","awareness"],       upright: "Notice what has a hold on you. Awareness loosens the chain.",          reversed: "A chain is loosening. Name what you're ready to release." },
  { id: "m-16", number: 16, name: "The Tower",           arcana: "Major", glyph: "🌪️", keywords: ["upheaval","truth","clearing"],         upright: "Something cracks open. What's left is more honest.",                   reversed: "Avoiding a needed shake-up. Better to face it on your terms." },
  { id: "m-17", number: 17, name: "The Star",            arcana: "Major", glyph: "⭐", keywords: ["hope","gentleness","renewal"],          upright: "Quiet hope returns. Drink water, look up.",                            reversed: "Hope feels far. Start with one small act of care." },
  { id: "m-18", number: 18, name: "The Moon",            arcana: "Major", glyph: "🌝", keywords: ["intuition","dreams","unknowing"],       upright: "Not everything needs to be clear yet. Trust the dim.",                 reversed: "Confusion is lifting. The fear was bigger than the truth." },
  { id: "m-19", number: 19, name: "The Sun",             arcana: "Major", glyph: "🌞", keywords: ["joy","clarity","warmth"],               upright: "A simple, warm yes. Let yourself enjoy what is good.",                 reversed: "Joy feels muffled. Step into a small patch of light anyway." },
  { id: "m-20", number: 20, name: "Judgement",           arcana: "Major", glyph: "📯", keywords: ["calling","awakening","review"],         upright: "Something is calling you back to yourself. Answer softly.",            reversed: "You hear the call but doubt it. Trust the small yes." },
  { id: "m-21", number: 21, name: "The World",           arcana: "Major", glyph: "🌍", keywords: ["completion","wholeness","threshold"],   upright: "A cycle closes. Honor it before you start the next.",                  reversed: "Almost finished. Don't skip the closing — it carries you forward." },
];

const SUIT_META: Record<TarotSuit, { glyph: string; element: string; theme: string }> = {
  Wands:     { glyph: "🔥", element: "Fire",  theme: "energy, will, creativity" },
  Cups:      { glyph: "🌊", element: "Water", theme: "feeling, relationship, intuition" },
  Swords:    { glyph: "🗡️", element: "Air",   theme: "thought, truth, decisions" },
  Pentacles: { glyph: "🪙", element: "Earth", theme: "body, work, resources" },
};

const RANK_NAMES: Record<number, string> = {
  1: "Ace", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Page", 12: "Knight", 13: "Queen", 14: "King",
};

// Compact upright meanings — short, grounded, caregiver-friendly.
const MINOR_MEANINGS: Record<string, { upright: string; reversed: string }> = {
  "Wands-1":  { upright: "A spark. Begin small, just one match.",            reversed: "The spark stalled. Re-light it with one tiny act." },
  "Wands-2":  { upright: "Plan a next step from where you stand.",            reversed: "Overthinking the map. Take the next visible step." },
  "Wands-3":  { upright: "Wait kindly for what you set in motion.",           reversed: "Delays test patience. Tend the wait, don't poke it." },
  "Wands-4":  { upright: "Small celebration. A safe corner to land.",         reversed: "Home feels uneasy. Repair one small corner of it." },
  "Wands-5":  { upright: "Friction is normal. Don't take it personally.",     reversed: "Conflict is easing. Step out of the scuffle now." },
  "Wands-6":  { upright: "A quiet win. Let yourself feel it.",                reversed: "Recognition feels off. Define your own win first." },
  "Wands-7":  { upright: "Hold your ground without fighting.",                reversed: "Defensive and tired. Choose which battle is yours." },
  "Wands-8":  { upright: "Things move quickly. Ride one wave at a time.",     reversed: "Things stalled. Slow is its own kind of movement." },
  "Wands-9":  { upright: "Almost there. Rest, don't quit.",                   reversed: "Burnt out from bracing. Permission to lay the shield down." },
  "Wands-10": { upright: "You're carrying too much. Set one thing down.",     reversed: "You're starting to release. Keep going, one item at a time." },
  "Wands-11": { upright: "Curiosity returns. Explore lightly.",               reversed: "Restless without aim. Pick one curiosity and follow it." },
  "Wands-12": { upright: "Move toward what excites you, gently.",             reversed: "Acting impulsively. Pause one beat before you leap." },
  "Wands-13": { upright: "Warm leadership — start with yourself.",            reversed: "Heat without direction. Cool the tone, keep the fire." },
  "Wands-14": { upright: "Steady fire. Lead by tending, not pushing.",        reversed: "Controlling instead of guiding. Let others carry their flame." },
  "Cups-1":   { upright: "Feeling opens. Let one drop in.",                   reversed: "Feeling blocked. A small honest cry would help." },
  "Cups-2":   { upright: "A meeting of hearts — even with yourself.",         reversed: "A bond is strained. Speak the small unspoken thing." },
  "Cups-3":   { upright: "Reach out. Small joy multiplies.",                  reversed: "Crowded but lonely. One real conversation beats many." },
  "Cups-4":   { upright: "You're a little numb. That's data, not failure.",   reversed: "Coming back to life. Notice what flickers." },
  "Cups-5":   { upright: "Grief is here. So is what's still left.",           reversed: "Grief is softening. Turn slowly toward what remains." },
  "Cups-6":   { upright: "A tender memory wants company.",                    reversed: "Living in the past. Bring its kindness into today." },
  "Cups-7":   { upright: "Many options, foggy. Pick one to test.",            reversed: "Clarity returns. Cross off what was never really yours." },
  "Cups-8":   { upright: "Walk away from what no longer feeds you.",          reversed: "Hovering at the door. It's okay to leave or to stay — choose." },
  "Cups-9":   { upright: "Quiet contentment. Notice it on purpose.",          reversed: "Wanting more without naming it. Name the actual hunger." },
  "Cups-10":  { upright: "Belonging — even a small pocket of it.",            reversed: "A gap in connection. Repair one thread today." },
  "Cups-11":  { upright: "A soft message arrives. Stay open.",                reversed: "Overly tender or guarded. Find the middle of your heart." },
  "Cups-12":  { upright: "Move toward what moves you, slowly.",               reversed: "Romanticizing. Look at what's actually true." },
  "Cups-13":  { upright: "Mother to your own feelings today.",                reversed: "Drowning in feeling. Solid ground first, story later." },
  "Cups-14":  { upright: "Steady-hearted. Hold space without drowning.",      reversed: "Moodiness spilling out. Contain the wave before you share it." },
  "Swords-1": { upright: "A clear thought cuts through. Use it kindly.",      reversed: "Confused thinking. Wait for the next clean thought." },
  "Swords-2": { upright: "Decision pending. You can wait one more day.",      reversed: "Avoidance has become the choice. Open your eyes." },
  "Swords-3": { upright: "Hurt is here. Naming it eases it a little.",        reversed: "The sharpness softens. Begin the slow mend." },
  "Swords-4": { upright: "Rest is required. Lie down on purpose.",            reversed: "Rest interrupted. Reclaim the smallest pause you can." },
  "Swords-5": { upright: "Pick your battles — most aren't yours.",            reversed: "Time to repair. Lay the sword down first." },
  "Swords-6": { upright: "Move toward calmer water, even slowly.",            reversed: "Stuck mid-crossing. Keep paddling — calmer water is real." },
  "Swords-7": { upright: "Be honest with yourself first.",                    reversed: "A truth wants out. Say it before it leaks sideways." },
  "Swords-8": { upright: "The cage may have an open door. Look.",             reversed: "A way out reveals itself. Take one careful step." },
  "Swords-9": { upright: "Anxious mind. Feet on floor. Slow breath.",         reversed: "The worst story is loosening. Test it against today's facts." },
  "Swords-10": { upright: "Something is over. Lay it down completely.",       reversed: "The ending is real but recovery has begun." },
  "Swords-11": { upright: "Curious mind, sharp tongue — soften it.",          reversed: "Words cutting where care was meant. Edit before sending." },
  "Swords-12": { upright: "Speak truth, but pace yourself.",                  reversed: "Reckless honesty. Truth lands better when timed." },
  "Swords-13": { upright: "Clear-eyed honesty, said with care.",              reversed: "Coldness disguised as truth. Add warmth back in." },
  "Swords-14": { upright: "Fair, firm, and kind — to yourself too.",          reversed: "Authoritative tone hiding fear. Lead from steady, not stern." },
  "Pentacles-1":  { upright: "A small seed of stability. Plant it.",          reversed: "An opportunity nearly missed. Tend it before it slips." },
  "Pentacles-2":  { upright: "Juggling. Drop something on purpose.",          reversed: "Overwhelmed by all of it. One ball, one hand." },
  "Pentacles-3":  { upright: "Ask for help. Build with others.",              reversed: "Doing it all alone again. Invite one collaborator." },
  "Pentacles-4":  { upright: "Holding tightly. Loosen one finger.",           reversed: "Releasing a clench. Let a little flow back in." },
  "Pentacles-5":  { upright: "Lean on what you have. Help is nearby.",        reversed: "A way through opens. Accept the offered hand." },
  "Pentacles-6":  { upright: "Give and receive — both count.",                reversed: "Out of balance. Notice if you only ever give or only ever take." },
  "Pentacles-7":  { upright: "Pause to assess. No need to overhaul.",         reversed: "Impatient with growth. Give it one more season." },
  "Pentacles-8":  { upright: "Quiet, repetitive work. It's adding up.",       reversed: "Going through motions. Re-meet the craft with care." },
  "Pentacles-9":  { upright: "Enjoy what you've made. You earned it.",        reversed: "Comfort feels hollow. Reconnect to what matters underneath." },
  "Pentacles-10": { upright: "Roots, home, lineage. Tend the small daily.",   reversed: "A family or financial knot. One small honest conversation." },
  "Pentacles-11": { upright: "Steady learner. Take a tiny next step.",        reversed: "Stalled studies. Begin again at the easiest entry point." },
  "Pentacles-12": { upright: "Slow and reliable beats fast and frantic.",     reversed: "Stuck in a rut. Vary the pace by one degree." },
  "Pentacles-13": { upright: "Practical care. Feed yourself well today.",     reversed: "Self-care has slipped. One nourishing thing today." },
  "Pentacles-14": { upright: "Provide for yourself first, then others.",      reversed: "Holding too tightly to security. Generosity is also safe." },
};

const MINOR: TarotCard[] = (Object.keys(SUIT_META) as TarotSuit[]).flatMap((suit) =>
  Array.from({ length: 14 }, (_, i) => {
    const rank = i + 1;
    const meta = SUIT_META[suit];
    const name = `${RANK_NAMES[rank]} of ${suit}`;
    const meaning = MINOR_MEANINGS[`${suit}-${rank}`];
    return {
      id: `${suit.toLowerCase()}-${rank}`,
      name,
      arcana: "Minor" as TarotArcana,
      suit,
      number: rank,
      glyph: meta.glyph,
      keywords: meta.theme.split(", "),
      upright: meaning?.upright ?? `${meta.theme}.`,
      reversed: meaning?.reversed ?? `Blocked or inverted ${meta.theme}.`,
    };
  }),
);

export const TAROT_DECK: TarotCard[] = [...MAJOR, ...MINOR];

export function randomCard(exclude?: string): TarotCard {
  const pool = exclude ? TAROT_DECK.filter((c) => c.id !== exclude) : TAROT_DECK;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Random orientation, weighted 50/50. */
export function randomOrientation(): TarotOrientation {
  return Math.random() < 0.5 ? "upright" : "reversed";
}

/** Convenience: a random card with a random orientation. */
export function randomDraw(exclude?: string): { card: TarotCard; orientation: TarotOrientation } {
  return { card: randomCard(exclude), orientation: randomOrientation() };
}

export function getCardById(id: string): TarotCard | undefined {
  return TAROT_DECK.find((c) => c.id === id);
}

/** Returns the meaning text for a card in a given orientation. */
export function meaningFor(card: TarotCard, orientation: TarotOrientation): string {
  return orientation === "reversed" ? card.reversed : card.upright;
}
