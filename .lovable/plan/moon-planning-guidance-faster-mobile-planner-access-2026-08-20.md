# Moon planning guidance + faster mobile planner access

Two small, focused additions.

## 1. Brief planning guidance for the moon

Today's Moon Insight card on the planner shows the phase, illumination, moon sign, element and cycle phase — but no advice about *how to plan* the day.

Add a one-line, plain-language planning tip derived from the moon phase, gently adjusted by the zodiac element:

- New Moon — "Plan light. Leave room for one new start."
- Waxing Crescent — "Two or three real tasks. Protect the momentum."
- First Quarter — "Expect friction — schedule the hard thing early."
- Waxing Gibbous — "Finish before you add. No new commitments today."
- Full Moon — "Full day energy, low patience. Buffer between blocks."
- Waning Gibbous — "Good day for handoffs, errands and follow-ups."
- Last Quarter — "Clear the backlog. Cancel one thing guilt-free."
- Waning Crescent — "Under-plan on purpose. Rest is on the schedule."

Element adds a short suffix (fire: "front-load", water: "leave slack", earth: "batch similar tasks", air: "cluster calls and messages").

Where it shows:
- In the collapsed Moon Insight header, on its own line under the invitation, marked with a small compass/sparkle icon so it reads as guidance, not mood.
- In the compact `MoonEnergyCard` used in the planner context panel, same one-liner.
- Included in the Moon Insight PDF export line-up (it already prints phase + invitation).

## 2. Quick planner access on mobile + a calmer quick-add

The floating quick-add button currently expands into a vertical stack of 9 labelled pills plus the Carey avatar — a tall wall that covers most of the screen on a phone, and there's no way to jump to the planner from it.

Changes:
- **Planner shortcut**: add a dedicated Planner action that opens today's planner day view directly. On mobile it also appears as a persistent small secondary button next to the FAB (a calendar pill), so getting to the planner is one tap without expanding the menu.
- **Reduce clutter**: replace the vertical pill stack with a compact card that holds a 3-column grid of icon tiles with tiny labels — roughly half the height. Primary actions (Quick add, Planner, Note, Voice) sit in the first row; the rest (Journal, Checklist, Notepad, Task tray, Photo, PDF) follow, with Ask Carey as a single full-width row at the bottom.
- Backdrop tap and Escape close the panel; existing drag-to-move, haptics, file pickers, and upload behaviour stay exactly as they are.

## Technical notes

- New `src/lib/planner/moon-planning-tip.ts` exporting `moonPlanningTip(date)` → `{ text }`, built from `getMoonPhase` in `src/lib/moon.ts` plus the element from `getMoonJournalContext`.
- Rendered in `PlannerMoonInsight.tsx` (collapsed header) and `MoonEnergyCard.tsx`; added to `src/lib/planner/moon-insight-pdf.ts`.
- `src/components/quick-add/CombinedFab.tsx`: actions array gains a `planner` entry navigating to `/planner`; expanded menu re-laid-out as a grid inside one rounded card; add a mobile-only planner pill beside the main FAB.
- No backend or data-model changes.
