# Cosmic visual refresh + Life Area Goals

## Part 1: Visual design improvements (Cosmic pages)

Shared across all pages:
- One page header style: a soft sky band with the date, moon glyph and season, a back link, and the date arrows built in (44px tap targets).
- A gentle "sky" background on these pages only: cream paper with faint star specks and a slow drifting glow. It turns off when the device asks for reduced motion.
- Cards share one look: rounded, soft shadow, serif heading, small gold caps label above it.
- Small motion: moons fade and rise in when they load, phase rings fill as you check things off, and tabs slide instead of jump.

Per page:
- **Sky / Signs & Motion:** each planet becomes a card with its glyph in a sign-coloured circle, a small arc showing how far through the sign it is, and a "retrograde" ribbon when relevant. Swipeable on phones, a grid on tablet and desktop.
- **Lunations & Eclipses:** a vertical timeline with large moon drawings. Eclipses get a halo ring, and each one shows which of your houses it falls in.
- **Moon & Rituals:** a large live moon at the top showing how lit it is, the sign and the phase (Plan / Grow / Care / Let go) as a coloured chip. The ritual checklist sits beside it on desktop and below it on phone.
- **Monthly moonscape (Moon Arc):** a soft glow on today's moon, the moons animate along the arc in sequence, and the phase cards gain a small progress bar for that phase's intention.
- **Houses:** a 12-slice wheel you can tap. Each slice shows the sign, the ruler and any planets passing through. Tapping one opens that house's detail and (new) its goals. Phones get a 2-column card grid under a smaller wheel.
- **Compare:** two charts side by side on desktop, stacked on phone, with matching colours, and the aspect list grouped as Harmony / Tension / Spark.

## Part 2: Life Area Goals (connected to the houses)

- Each goal can belong to one of the 12 life areas: 1 Self, 2 Money & values, 3 Communication, 4 Home & family, 5 Joy & creativity, 6 Health & daily care, 7 Partnerships, 8 Shared resources & healing, 9 Learning & travel, 10 Career & purpose, 11 Community & hopes, 12 Rest & spirit.
- **Goals page:** a new "Life areas" view shows the 12 areas as cards. Each card shows its goals, their progress, and how many tasks and projects are linked. You can add a goal straight into an area.
- **Linking:** in a goal you can attach existing tasks and projects, or create a new task for it. Progress can update itself from finished tasks, or you can set it by hand.
- **Houses page:** each house shows its goals and offers "Add goal". It also points out timing, for example "Jupiter is moving through this area" or "Your year's focus area (profection)".
- **Tasks and projects:** the editor gets a goal picker, and a small life-area chip shows on linked items.
- **Moon tie-in:** the new moon reminder suggests goals in the area where that new moon falls.

## Technical details
- Migration: add a nullable `life_house smallint` (1–12, check constraint) to `goals`. The existing RLS/grants stay.
- Links reuse the existing `tasks.goal_id` and `projects.linked_goal_ids`. No new tables.
- Auto progress = done tasks / linked tasks. A per-goal toggle is stored in the existing `anchor_key`-free path: a new boolean `auto_progress` column in the same migration.
- New `src/lib/goals/life-areas.ts` (labels, house→area mapping, progress helper) plus unit tests for the mapping and progress.
- Visual work uses semantic and phase tokens only, `motion-safe:` utilities, and Playwright checks at 384, 820 and 1280px.
- Order: Life Area Goals first (data plus Goals and Houses), then the visual pass page by page.
