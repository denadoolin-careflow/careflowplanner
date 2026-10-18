# Accurate whole-sign houses + rising sign across Cosmic Flow

## What's true today
- The main house math already uses whole-sign houses: house 1 = the whole sign your Ascendant is in, then one sign per house.
- Your saved chart has no birth time/place, so there is no Ascendant. The wheel then counts houses from your Sun's sign, and nothing says "rising sign unknown" clearly everywhere.
- An older birth-chart page (Cosmic Flow birth chart summary) uses a separate, rougher rising-sign shortcut that can disagree with the Natal page.
- Some pages say "rising" in the AI daily/chapter text only when houses exist; others (Today's Sky, Houses, Transit Grid, Compare, Moon guide) don't show the rising sign at all.

## Changes
1. **Natal wheel accuracy**
   - Draw house lines exactly on sign boundaries (0° of each sign), with house 1 = the Ascendant's sign; the Ascendant line itself sits inside house 1 at its true degree, labelled "As" with sign + degree.
   - Midheaven shown as its own marker (in whole-sign it can fall in houses 9–11); its house noted in the corner card.
   - Corner card: "Rising: Libra 14°  ·  Whole Sign houses", or "Rising unknown — add birth time & place" with houses marked as Sun-sign based.
2. **One source of truth for the rising sign**
   - Retire the rough shortcut on the older birth-chart summary; it reads the same chart as the Natal page.
3. **Rising sign everywhere in Cosmic Flow**
   - Cosmic Flow header/dashboard: "Sun · Moon · Rising" trio, plus chart ruler.
   - Houses page: house 1 headed with the rising sign and chart ruler.
   - Transit Grid & Sky: transits to the Ascendant/Midheaven included and the house each transit hits.
   - Chapter & daily guidance: rising sign, chart ruler and profection always passed in when known.
   - Moon & Rituals / lunations: house each new/full Moon falls in, counted from the rising sign.
   - Compare: show each person's rising when a birth time and place are given.
4. **Approximate times**: when birth time is marked approximate, show "≈" beside the rising sign and a note if the Ascendant is within 3° of a sign change.
5. **Tests**: whole-sign cusps fall on 0° sign boundaries; a planet at 29° of the rising sign is house 1 and 0° of the next sign is house 2; known chart gives expected rising sign.

## Note
Your real birthplace and birth time are still needed for the rising sign to appear for you — send them anytime and I'll save them.

## Technical details
- `astro/houses.ts` `computeHouses` is the single source; `NatalWheel.tsx` stops using the exact ascendant degree as the house anchor fallback and draws cusps from `houses.cusps`.
- Replace `natal.ts` ascendant (`lst/30`) with `computeHouses` via `computeNatalV2`.
- Add Ascendant/MC as transit targets in `useTransitsRange.ts` and `sky.ts`.
