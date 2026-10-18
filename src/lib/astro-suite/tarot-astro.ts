/**
 * Traditional Golden-Dawn style mapping from each tarot card to its
 * astrological correspondence (a planet or a zodiac sign).
 *
 * Used by the Tarot card detail view to deep-link into the Birth Chart
 * page so the user can see how that card's energy is currently expressed
 * in their natal chart.
 */

import type { TarotCard, TarotSuit } from "./tarot";
import type { ZodiacSign } from "./zodiac";
type PlanetKey = string;

export type TarotAstroLink =
  | { kind: "planet"; planet: PlanetKey; label: string }
  | { kind: "sign"; sign: ZodiacSign; label: string };

/** Major Arcana → planet or sign (Golden Dawn / Hermetic). */
const MAJOR_LINK: Record<number, TarotAstroLink> = {
  0:  { kind: "planet", planet: "Uranus",  label: "Uranus" },        // Fool — air / Uranus
  1:  { kind: "planet", planet: "Mercury", label: "Mercury" },       // Magician
  2:  { kind: "planet", planet: "Moon",    label: "Moon" },          // High Priestess
  3:  { kind: "planet", planet: "Venus",   label: "Venus" },         // Empress
  4:  { kind: "sign",   sign: "Aries",      label: "Aries" },         // Emperor
  5:  { kind: "sign",   sign: "Taurus",     label: "Taurus" },        // Hierophant
  6:  { kind: "sign",   sign: "Gemini",     label: "Gemini" },        // Lovers
  7:  { kind: "sign",   sign: "Cancer",     label: "Cancer" },        // Chariot
  8:  { kind: "sign",   sign: "Leo",        label: "Leo" },           // Strength
  9:  { kind: "sign",   sign: "Virgo",      label: "Virgo" },         // Hermit
  10: { kind: "planet", planet: "Jupiter", label: "Jupiter" },       // Wheel of Fortune
  11: { kind: "sign",   sign: "Libra",      label: "Libra" },         // Justice
  12: { kind: "planet", planet: "Neptune", label: "Neptune" },       // Hanged One
  13: { kind: "sign",   sign: "Scorpio",    label: "Scorpio" },       // Death
  14: { kind: "sign",   sign: "Sagittarius",label: "Sagittarius" },   // Temperance
  15: { kind: "sign",   sign: "Capricorn",  label: "Capricorn" },     // Devil
  16: { kind: "planet", planet: "Mars",    label: "Mars" },          // Tower
  17: { kind: "sign",   sign: "Aquarius",   label: "Aquarius" },      // Star
  18: { kind: "sign",   sign: "Pisces",     label: "Pisces" },        // Moon
  19: { kind: "planet", planet: "Sun",     label: "Sun" },           // Sun
  20: { kind: "planet", planet: "Pluto",   label: "Pluto" },         // Judgement
  21: { kind: "planet", planet: "Saturn",  label: "Saturn" },        // World
};

/** Court cards → ruling sign of their suit / element. */
const COURT_SIGN: Record<TarotSuit, { Page: ZodiacSign; Knight: ZodiacSign; Queen: ZodiacSign; King: ZodiacSign }> = {
  Wands:     { Page: "Sagittarius", Knight: "Sagittarius", Queen: "Aries",     King: "Leo" },
  Cups:      { Page: "Pisces",      Knight: "Pisces",      Queen: "Cancer",    King: "Scorpio" },
  Swords:    { Page: "Aquarius",    Knight: "Aquarius",    Queen: "Libra",     King: "Gemini" },
  Pentacles: { Page: "Virgo",       Knight: "Virgo",       Queen: "Capricorn", King: "Taurus" },
};

/** Number cards 2-10 → decan sign per Golden Dawn (3 cards per sign). */
const PIP_SIGN: Record<TarotSuit, Record<number, ZodiacSign>> = {
  Wands: {
    2: "Aries", 3: "Aries", 4: "Aries",
    5: "Leo",   6: "Leo",   7: "Leo",
    8: "Sagittarius", 9: "Sagittarius", 10: "Sagittarius",
  },
  Cups: {
    2: "Cancer", 3: "Cancer", 4: "Cancer",
    5: "Scorpio", 6: "Scorpio", 7: "Scorpio",
    8: "Pisces", 9: "Pisces", 10: "Pisces",
  },
  Swords: {
    2: "Libra", 3: "Libra", 4: "Libra",
    5: "Aquarius", 6: "Aquarius", 7: "Aquarius",
    8: "Gemini", 9: "Gemini", 10: "Gemini",
  },
  Pentacles: {
    2: "Capricorn", 3: "Capricorn", 4: "Capricorn",
    5: "Taurus",    6: "Taurus",    7: "Taurus",
    8: "Virgo",     9: "Virgo",     10: "Virgo",
  },
};

const RANK_LABEL: Record<number, "Page" | "Knight" | "Queen" | "King"> = {
  11: "Page", 12: "Knight", 13: "Queen", 14: "King",
};

/** Resolve the astrological correspondence for a tarot card, if any. */
export function getTarotAstro(card: TarotCard): TarotAstroLink | null {
  if (card.arcana === "Major" && card.number != null) {
    return MAJOR_LINK[card.number] ?? null;
  }
  if (card.arcana === "Minor" && card.suit && card.number != null) {
    // Aces map to the suit's element overall — no single sign.
    if (card.number === 1) return null;
    if (card.number >= 11) {
      const rank = RANK_LABEL[card.number];
      return { kind: "sign", sign: COURT_SIGN[card.suit][rank], label: COURT_SIGN[card.suit][rank] };
    }
    const sign = PIP_SIGN[card.suit][card.number];
    return sign ? { kind: "sign", sign, label: sign } : null;
  }
  return null;
}

/** Build a deep link to the birth chart page focused on the given target. */
export function birthChartLinkFor(link: TarotAstroLink): string {
  if (link.kind === "planet") return `/cosmic-flow/almanac?focus=${encodeURIComponent(link.planet.toLowerCase())}`;
  return `/cosmic-flow/almanac?focus=${encodeURIComponent(link.sign.toLowerCase())}`;
}
