# Week view: Full Insight weekly planner

Rebuild the Planner's **Week → Grid** mode into a true 7-column calendar with rich day headers (weather, moon, zodiac, day theme), a shared time gutter, a live now-line, real duration-sized event blocks, an all-day row, and a category legend. Everything else in CareFlow — sidebar, brand, data model, capture/focus/plan flows, Board mode, Day/Month/Year — stays as-is.

## What you'll see

**Day headers (Full Insight, default)**
Each of the 7 columns gets a structured header: weekday + date, weather (icon + temp), an SVG moon illustration with phase name and illumination %, a zodiac glyph + sign, then the day's theme name, a one-line blurb, and a "Good for:" line. Today's column is emphasized with a warm tint and a filled date badge.

**Compact toggle**
A small control in the week toolbar switches between:
- *Full Insight* — everything above (default, remembered per user)
- *Compact* — date + weather + small moon icon only, so a busy week stays readable

**All-day row**
One row under the headers for birthdays, holidays, all-day appointments and due-today items. Never takes hourly space; overflow collapses to "+N more".

**Time grid**
A fixed left TIME gutter (6 AM – 8 PM in view, scrollable across the full 5 AM–10 PM range) with solid hour lines and lighter half-hour lines. The gutter stays pinned while the grid scrolls; on narrow screens day columns scroll horizontally under pinned headers.

**Now line**
A thin terracotta line across the current day, with a dot and a live "12:02 PM" label in the gutter, updating each minute.

**Events**
Real blocks sized to duration, showing category icon, title, time range, and location when present. Soft category colors: Personal sage, Family rose, Health lavender, Home cream/gold, Admin peach, Social muted green, Finance dusty red. Existing interactions are preserved: click to open, drag to move (including across days), resize to change duration, click empty space to create.

**Breathing room**
Days with light commitment get a faint "open space" wash in their empty stretches so you can see where there's room; heavily booked days pick up a subtle density tint at the top of the column.

**Legend**
A quiet bottom strip of small color dots for the seven categories, with "Customize View" on the right opening the existing kind-filter/color controls.

## Technical notes

- New `src/lib/planner/day-theme.ts`: derives `{ themeName, blurb, goodFor[], color, icon }` from date + moon phase + moon zodiac sign, composed from existing `moon.ts` (`getMoonPhase`, `getIllumination`), `zodiac.ts` glyphs and `lib/cosmic` helpers. Table-driven so the seven sample themes fall out naturally; shaped to later accept user overrides (custom name/color/icon/actions) without changing callers.
- New `src/components/planner/WeekDayHeader.tsx` renders one column header and reads weather from `useWeatherSnapshot()` daily forecast; a new `MoonGlyph` SVG (reusing `MoonSVG` from `MoonInsightCard`) replaces emoji.
- `PlannerWeekGrid.tsx` is restructured: a single shared time gutter plus a 7-column body instead of 7 independent `PlannerTimeline` instances, so hour lines align across days. `PlannerTimeline` gains a gutterless rendering path (extending the existing `bare` prop) and keeps its drag/resize/quick-edit handlers and `planner-metrics` slot math, so cross-day drag and undo/redo behave as today.
- Items keep flowing from `usePlannerFeed`; category color mapping extends `calendar-colors.ts` with the seven named categories, keeping stored user color prefs.
- Insight/Compact mode persists via `planner-prefs.ts` (`weekHeaderMode`), alongside the existing week Grid/Board mode.
- Now-line and open-space shading are presentational only, computed from the feed; no schema or store changes. Sample events are not hardcoded — the reference week renders from real data.
- Responsive: >=1024px shows all 7 columns; below that the grid scrolls horizontally with the gutter pinned and today auto-scrolled into view. Mobile keeps the existing Day / 3 Days / Week pills.