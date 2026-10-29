# Three Today page mockups (Plan · Grow · Care · Let go)

A preview page with three Today designs, each shown side by side as a phone frame and a desktop frame. The page uses sample content, so your real Today page and data stay as they are. You then pick one (or a mix) to build.

## Shared across all three
- The same header: date, time, Moon phase/sign, season, cycle day, the phase you're in now, and the five-timeframe strip (Day · Week · Month · Season · Year).
- Every card sits in its phase: **Plan** (top 3, schedule, rhythm and Moon aspects, Focus), **Grow** (focus goal, habits and routines, project next step, monthly step), **Care** (meals, cleaning and laundry, loved ones, self-care, meds, mail and documents), **Let go** (cosmic check-in, journal, day review, task rollover, evening tarot).
- Phase icons and colors (leaf, sprout, heart, crescent moon); Gentle reminders grouped in one place.

## A · Phase Tabs ("one phase at a time")
- Phone: a sticky four-phase tab bar under the header; each tab shows only that phase's cards, and it opens on the phase that matches the time of day.
- Desktop: a fixed left list of phases and a wide center column for the open phase, with the schedule always pinned on the right.
- Best for focus and less scrolling.

## B · Day Flow ("the day as a river")
- Phone: one scrolling column ordered Plan (morning) → Grow (midday) → Care (afternoon) → Let go (evening), with a progress line showing where "now" is and earlier phases folded.
- Desktop: two columns — the timeline on the left, and on the right the phase sections line up beside the hours they belong to.
- Best for following the natural rhythm of the day.

## C · Four-Quadrant Board ("everything at a glance")
- Phone: a 2×2 grid of phase tiles with counts and one key item each; tapping a tile expands it full screen.
- Desktop: four equal quadrants (Plan, Grow, Care, Let go) under the header, each a compact scrolling card list, with the schedule as a slim strip across the top.
- Best for a quick overview and planning-style users.

## After the mockups
You choose A, B, C or a mix; I then build it as the real Today layout (or as a choice in Today settings), keeping all existing cards and data.

## Technical details
- New page `src/pages/TodayMockups.tsx` at `/today-mockups` (temporary, removed after choosing), static sample data, built from the existing phase icons, rhythm color tokens and card styles; phone frames about 390px wide and desktop frames about 1200px wide, scaled to fit.
- Checked at phone and desktop widths in the browser before handing over.
