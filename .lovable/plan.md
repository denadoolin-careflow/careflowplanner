# Today page redesign (Day Flow first, all layouts tidied)

Layout, accessibility and style only. No data model, store or route changes; every existing feature stays.

## Phone order
1. Slim sticky header: "Sunday · Today" + big date, prev/next, one calendar button (date picker, layout choice, Today preferences, Today/Week/Month scope as a compact segmented control).
2. Day card: modernised TodayMoonHeader (sky gradient + RealMoon, eyebrow, smaller clock 44/64px, moon phase + sign, weather pill, season · cycle line) with the Plan/Grow/Care/Let go row inside; current phase larger, filled, ringed, "NOW", popovers kept.
3. Today's guidance card on the active phase tint: icon eyebrow, serif title, advice, 3 actions as 48px rows, italic affirmation, Moon & rituals link.
4. Check-in (ArriveBand): "How much do you have today?", 4-column radiogroup (48px), labelled "One line for today" input, overdue chip.
5. Focus card: dark NOW bar + "Next at…" line, then Top 3 with "Add a priority".
6. Gentle reminders: one tinted row, first item + "+N more" expander; hidden when empty.
7. Your day: four phase bands; only the current-time phase open (main-color outline, "NOW · until 11am"); others collapse to icon + name + window + live one-line summary. Morning Reset moves into Plan, Evening Reflection into Let go, Carey nudges as a small "Carey suggests" note in the open band. Inline "Add to …" rows kept.
8. Today's notebook: header (date, save status, search, open full note), daily note with the four day sections as phase-colored headings and prompts as placeholders, then Notes (search, linked/pinned/recent, New note). Reuses the existing editor and daily-note controller.
9. Your rhythms: Twin Rings + five timeframe rows (Day/Week/Month/Season/Year with phase badge, deep-colored name, short detail), cycle line, "Edit cycle dates". Replaces the top horizon chips and focus goal chip (focus goal stays inside Grow).
10. Top quick-add bar removed; round centre "+" in the bottom nav (Today · Planner · + · Care · More) opens the same quick-add.

## Desktop (1024px+)
- Same header with scope tabs, a single "Layout" dropdown, and an Add button.
- Row 1: Day card and Guidance side by side.
- Row 2 (max ~1280px, 24px gaps): Left = check-in, Now + Top 3, reminders, "Waiting to be placed" preview; Centre = Your day; Right = Your rhythms, Today's notebook + Notes. Stacks on tablet.

## Style
- Cards 20px radius, card background, no border, soft layered shadow; only the current band gets a colored outline. Remove nested bordered panels.
- 16px gaps phone, 24px desktop.
- Phase colors only via rhythm tokens (tint backgrounds, deep text/icons, main for active, on-color for active icon); Let go is rose, never lavender. Icons from the shared phase icon set.
- One font pairing everywhere on Today: Playfair Display headings, Figtree body; drop the phone-only Outfit swap.
- Phase Tabs, Quadrants, Plan and Board reuse the new cards/tokens.

## Accessibility
- Minimum 12px text, 15px body; 44px tap targets (20-22px checkboxes in 44px rows).
- Phase always icon + label; aria-current on active phase, aria-expanded on bands, radiogroup for capacity, real input labels, text summary for Twin Rings.
- Contrast check (4.5:1) in light/dark for deep-on-tint and active badges; adjust token values only if a pair fails.
- prefers-reduced-motion disables moon/phase animations.

## Technical details
- Split Today.tsx into section components under src/components/today/flow/ (TodayTopBar, DayCard, GuidanceCard, FocusCard, ReminderRow, PhaseBand + phase summaries hook, TodayNotebookCard, RhythmsCard), composed by a DayFlowLayout and a DesktopTodayGrid.
- Phase summaries derive from existing hooks (tasks, appointments, habits, focus goal, meals, laundry, journal/review counts) — read-only.
- Notebook card reuses BlockEditor and the existing schedule-pane daily-note controller; day section headings come from HORIZON_PHASES.day.
- BottomNav gets a centre Add action triggering the existing QuickAddBar dialog/sheet; embedded Planner day keeps working.
- CSS: replace the .today-mobile-feed font override; add today card/shadow utilities in index.css using existing tokens.
- Tests: keep existing today-phase-items/today-view tests passing; add a test for the "current phase by time" + collapsed summary helper.
- Verify with Playwright at 390px and 1280px, light and dark.
