# Combine all three simplification options into the real Planner

Goal: one calm, consistent planner. No data changes; every existing feature stays reachable.

## 1. Unified navigation (Option 2) — the frame
- One slim header on every Planner screen: date, prev/next, one calendar button (date picker, layout, preferences).
- One scope bar: Day · Week · Month · Season · Year (Season/Year open the existing Rhythm horizon cards).
- Each scope offers just two layouts: **Schedule** (time-based) and **Cards** (phase-based). Older layouts (Phase Tabs, Quadrants, Plan, Board, table, etc.) move into the calendar menu under "More layouts" so nothing is lost.
- Remove duplicate sub-tab rows (period tabs, week/month mode tabs) from the main bar.

## 2. Calm Day feed (Option 1) — the Day screen
- Month photo becomes the header backdrop, with the moon phase and week strip sitting on it (one block instead of three).
- One Top 3 only (remove the second copy inside the embedded Today).
- Remove the second moon/date header inside the embedded Today; guidance stays as one card.
- "Your day" bands: only the current phase open.
- Rhythms, monthly moonscape and notebook tucked into one "More for today" card with tabs, below the bands.
- The separate "Schedule" section folds into the Schedule layout instead of always appearing below.

## 3. One visual language (Option 3) — everywhere
- One shared card style (20px radius, soft shadow, no outline) and one task row (20px checkbox, 44px tap area, wrapping title, phase dot) used on Day, Week, Month, Season, Year.
- Phase colors and icons always tint/deep/main as defined; never text in light colors.
- One central "+" Add (plain-language) in the bottom bar and desktop header; per-band inline Add rows stay.
- Remove the mockups page afterwards.

## Order of work
1. Header + scope bar + two-layout switch.
2. Day feed consolidation.
3. Shared card/task row applied across views; text sizes ≥12px.
4. Browser check at phone (390px) and desktop (1024/1440px); remove /planner-mockups.

## Technical notes
- Files: `Planner.tsx`, `Today.tsx`, `TodayFlowCards.tsx`, `MonthSeasonHeader`, `MobileWeekAgendaStrip`, `PlannerPriorityStrip`, a new shared `PlannerCard`/`PlannerTaskRow`.
- Layout preference keeps using the existing device-local layout prefs, mapped to Schedule/Cards; legacy values remain valid under "More layouts".
- Swipe thresholds and existing stores untouched.
