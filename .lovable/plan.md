# Today phase tabs: focus goal, matching phase icons, Let go lunar check-in

## 1. One set of phase icons across CareFlow (matching your image)
- Plan = leaf, Grow = sprout, Care = heart, Let go = crescent moon.
- Create one shared phase icon set and use it everywhere the four phases appear: Today tabs and header phase buttons, Project Garden columns, Projects views, Goals hub, Planner phase ribbon/Year view, rhythm cards, note phase properties.
- The wind/feather icon for Let go is removed everywhere it stands for the phase (Journal & Flow and breathing items keep their wind icon since they aren't the phase).
- Icons sit in a round phase-colored badge like the image (light phase fill, deeper phase color for the line icon).

## 2. Grow tab shows today's Focus Goal
- On phone, the Focus Goal card (pick or change the one goal to nudge forward) appears at the top of Grow, above habits and projects.
- The small goal chip under the header stays so it's visible from every tab.

## 3. Let go tab: Lunar check-in + writing space
At the top of Let go, a new "Check in with the cosmic flow" card:
- Today's Moon phase and sign, the Let go guidance for this phase, and the day's Moon transits/aspects with times (from the existing Moon aspect guide).
- One reflection prompt drawn from the day's strongest transit.
- An inline text box that grows as you type and saves into today's Daily Note under a "Cosmic check-in" heading (draft kept if you leave mid-thought).
- A "Journal this" link that opens the full journal with the prompt filled in.
- Existing journal and daily debrief stay below.

## Technical details
- New `src/lib/phase-icons.tsx` exporting `PHASE_ICONS` + `<PhaseIcon phase />` (lucide Leaf, Sprout, Heart, Moon). Replace per-file phase icon maps (Today MOBILE_TABS, ProjectGardenPage, ProjectCanvas, ProjectGroupedViews, GoalsHub, PhaseRibbon, RhythmDashboard, property-styles phase choices, TodayMoonHeader).
- Today.tsx: render `FocusGoalCard` in the grow branch; new `components/today/LunarCheckInCard.tsx` reusing lunarRhythmAt, MoonAspectGuide data and the existing daily-note append used by Sky "Reflect".
- Desktop: the same cards appear in their matching sections.
