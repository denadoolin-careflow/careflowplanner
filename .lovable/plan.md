# Rhythm Hub, five timeframes, and Today on desktop

## 1. Rhythm view in the Planner (one place for all five timeframes)
A new **Rhythm** option beside Day / Week / Month / Year in the Planner. At the top you pick a timeframe: **Day · Week · Month · Season · Year**. Each one shows four Plan · Grow · Care · Let go cards for the chosen period. Each card has:
- the name of that part of the timeframe (for example Week: Mon Intention, Tue–Thu Momentum, Fri–Sat Nurture, Sun Rest & Review)
- 2–3 short questions to answer
- a writing box that saves to the matching notebook note (daily, weekly or monthly note, plus a new season note and year note)
- a "you are here" mark on the phase you're in now (time of day, day of week, Moon phase, week of the season, or season of the year)

The arrows move to the previous or next day, week, month, season or year. Your Plan · Grow · Care · Let go icons and colors are used throughout.

## 2. Sunday weekly reset
- A guided reset in the Week timeframe with four steps: **Let go** (what went well, what to drop, unfinished tasks to move or let go), **Care** (energy and self-care check), **Plan** (one intention and top 3 for the week ahead), **Grow** (pick next week's focus goal). Answers save to that week's note.
- On Sundays, a gentle "Weekly reset" reminder appears in the Gentle reminders bar on Today and links to the reset.

## 3. Seasonal review (each quarter)
- A guided review in the Season timeframe: closing out the season (wins, what to let go), checking life-area goals, then setting one intention per phase for the next season. It works with your existing seasonal goals and compost.
- In the last two weeks of a season and the first week of the next, a "Season review" reminder appears on Today.

## 4. The five timeframes across CareFlow
- A small "Rhythm" link on the Planner's Day, Week, Month and Year views opens the matching timeframe.
- Notebook: the weekly, monthly, season and year notes get a "Plan · Grow · Care · Let go" section you can turn on in their templates.
- Today: a slim strip shows where you are in each timeframe (for example "Day: Grow · Week: Grow · Month: Care · Season: Plan · Year: Let go"). Tap it to open the Rhythm view.

## 5. Today on desktop
- A left-hand section menu (Plan · Grow · Care · Let go) that stays visible while you scroll, jumps to each section, and highlights the one you're viewing.
- Each section gets a phase-colored heading with its icon and caption (Prepare / Build / Support / Release) and can be folded; folded sections are remembered on that device.
- Cards in each section sit in a tidier two-column layout on wide screens. The schedule stays at the top.
- The Journal card's leftover "Grow" label changes to "Let go".
- Phone layout stays the same.

## Technical details
- New `src/lib/rhythm/horizons.ts`: horizon definitions (phase names, prompts), current-phase logic per horizon, period keys. Unit tests for the current-phase rules (Sunday maps to Let go, quarter boundaries follow solstices and equinoxes, Moon phase uses `lunarRhythmAt`).
- Extend `PeriodKind` in `src/lib/notes/periods.ts` with `quarterly` (key `YYYY-Qn`) and `yearly` (`YYYY`) in key, span, title and parent logic; the notes are ordinary period notes, so no new table.
- Answers are saved under per-phase headings in the period note body via the existing get-or-create and update helpers.
- Planner: add `"rhythm"` to the allowed views and URL handling; new `src/components/planner/rhythm/RhythmHub.tsx`, `HorizonPhaseCards.tsx`, `WeeklyResetFlow.tsx`, `SeasonReviewFlow.tsx`.
- Today: a `HorizonStrip`, weekly/season reminders inside `.today-notices`, and an upgraded `PhaseBand` with ids, an IntersectionObserver for the sticky menu, and folding stored in localStorage.
- Record the period-note extension rule in AGENTS.md.
