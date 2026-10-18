import { format } from "date-fns";
import { TAROT_DECK, getCardById, type TarotCard, type TarotOrientation } from "./tarot";
import { getOrCreateDailyNote, updateNote } from "@/lib/notes";
import { appendTimestampedEntry } from "@/lib/notes/timestamped-entries";
import { notifyDailyNotesChanged } from "@/lib/notes/daily";
import { pushAstroToAccount, syncAstroFromAccount } from "./astro-sync";

export type SpreadKind = "single" | "three-time" | "three-self" | "moon";

export const SPREADS: Record<SpreadKind, { label: string; positions: string[] }> = {
  single: { label: "Daily card", positions: ["Today"] },
  "three-time": { label: "Past · Present · Future", positions: ["Past", "Present", "Future"] },
  "three-self": { label: "Mind · Body · Spirit", positions: ["Mind", "Body", "Spirit"] },
  moon: { label: "Moon phase", positions: ["Release", "Tend", "Invite"] },
};

export interface PulledCard { id: string; orientation: TarotOrientation; position: string }
export interface TarotPull { id: string; date: string; spread: SpreadKind; cards: PulledCard[]; createdAt: number }

const KEY = "careflow.tarot-pulls.v1";
const MAX = 120;

export function loadPulls(): TarotPull[] {
  void syncAstroFromAccount();
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function savePulls(p: TarotPull[]) {
  localStorage.setItem(KEY, JSON.stringify(p.slice(0, MAX)));
  window.dispatchEvent(new Event("careflow:tarot-pulls"));
  pushAstroToAccount();
}

/** Draw N unique cards (shuffled with crypto when available). */
export function drawCards(n: number, rand: () => number = Math.random): { card: TarotCard; orientation: TarotOrientation }[] {
  const deck = [...TAROT_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n).map(card => ({ card, orientation: rand() < 0.25 ? "reversed" : "upright" }));
}

export function recordPull(spread: SpreadKind, drawn: { card: TarotCard; orientation: TarotOrientation }[]): TarotPull {
  const positions = SPREADS[spread].positions;
  const pull: TarotPull = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: format(new Date(), "yyyy-MM-dd"),
    spread,
    cards: drawn.map((d, i) => ({ id: d.card.id, orientation: d.orientation, position: positions[i] ?? "" })),
    createdAt: Date.now(),
  };
  savePulls([pull, ...loadPulls()]);
  return pull;
}

export function todaysDailyPull(): TarotPull | undefined {
  const today = format(new Date(), "yyyy-MM-dd");
  return loadPulls().find(p => p.date === today && p.spread === "single");
}

export function deletePull(id: string) { savePulls(loadPulls().filter(p => p.id !== id)); }

export function pullToText(pull: TarotPull): string {
  const parts = pull.cards.map(c => {
    const card = getCardById(c.id);
    if (!card) return "";
    const meaning = c.orientation === "reversed" ? card.reversed : card.upright;
    return `${c.position ? `**${c.position}:** ` : ""}${card.name}${c.orientation === "reversed" ? " (reversed)" : ""} — ${meaning}`;
  }).filter(Boolean);
  return `🔮 Tarot · ${SPREADS[pull.spread].label}: ${parts.join(" · ")}`;
}

/** Append text as a timestamped entry to today's daily note. */
export async function appendToTodaysNote(text: string) {
  const note = await getOrCreateDailyNote(format(new Date(), "yyyy-MM-dd"));
  await updateNote(note.id, { body: appendTimestampedEntry(note.body ?? "", text, format(new Date(), "HH:mm")) });
  notifyDailyNotesChanged();
}
