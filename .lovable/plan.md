
## Goal
Refine the desktop Planner (`/planner`) into a calmer, more editorial three-column command center that matches the attached mock while preserving every existing behavior (drag/drop, capture, Plan My Day, focus timer, command bar, task rail state, localStorage, calendar sync). Adds a Morning/Afternoon/Evening list toggle, an Apple-style unified Week grid, a Day Pulse insight, and header insight cards.

## Scope
- Desktop only. Mobile (`useIsMobile`) keeps its existing Sheet-based experience.
- No changes to backend, task/time-block schemas, or Plan My Day internals.
- Reuse existing tokens in `src/index.css`; add a small set of planner-scoped tokens for the plum/lavender/sage surface, not a global re-theme.

## Layout & tokens
1. In `src/index.css` add planner-scoped variables under a `.planner-surface` class: `--planner-bg` (deep plum/navy), `--planner-surface`, `--planner-surface-2`, `--planner-border` (1px translucent), `--planner-lavender`, `--planner-sage`, `--planner-gold`, `--planner-cream`. Radii tokens `--planner-radius-panel: 16px`, `--planner-radius-card: 14px`. Category tints (family/care=sage, reminder=lavender, personal=blue, errand=taupe, focus=gold) as CSS vars with `/ 0.14` fill + `/ 0.35` border variants.
2. Wrap the planner root in `src/pages/Planner.tsx` with `planner-surface` so tokens are scoped and don't leak.
3. Column widths: left 300px, center flex, right 320px, 20px gaps, tops aligned. Existing resize + hide toggle stays.

## Header (new components)
1. `src/components/planner/PlannerRhythmHeader.tsx` — replaces the current `<header>` in `Planner.tsx`. Left: dynamic greeting (`getGreeting()` from `src/lib/greeting.ts`) with `Sparkles` icon and the subtitle "Let's create a day that aligns with your rhythm." Right cluster keeps search / Carey / notifications / avatar via existing header controls (reuse `HeaderNowStrip` pieces if convenient, otherwise thin wrappers).
2. `src/components/planner/DayProgressRing.tsx` — SVG ring driven by scheduled-vs-completed ratio from the store; label "Day Progress · On track / Full / Soft".
3. `src/components/planner/MoonInsightCard.tsx` — uses existing `moon-phase.ts` / `MoonPhaseBadge` data source (no hardcoded July 12). CSS/SVG moon, phase name, `% illuminated`.
4. Below the header, a second row hosts the page title block:
   - Eyebrow "PLANNER", serif `font-display` title `format(day, "EEEE, MMMM d")`.
   - Left control group: `PlannerViewToggle` restyled as pill segmented control (Day · 3 Days · Week · Month).
   - Right control group: prev / `DayPickerButton` / next / Today / **Focus** / Plan my day (lavender secondary) / Capture (primary, split button with dropdown arrow).
5. Remove the visible `⌘K` pill (keep the shortcut listener). Command bar still opens via ⌘K.

## Capture split button
- `src/components/planner/CaptureMenu.tsx`: primary button opens the existing `PlannerQuickCapture`. Adjacent chevron opens a `DropdownMenu` with Task / Event / Note / Care item / Expense / Meal idea. Each item routes to the appropriate existing capture surface (Task → `PlannerQuickCapture`; Note → `/notes/new`; Expense → MoneyFlow capture; Meal idea → meals capture; Event/Care item → task with preset area). Wire to existing helpers only — no new backends.

## Focus mode
- New `src/components/planner/PlannerFocusButton.tsx` reads `pomodoro-store`. If a task is selected (existing `task-selection` context) start focus for it; otherwise open a small picker over today's tasks.
- When a pomodoro is active, header shows a chip "Focus · <title> · MM:SS remaining" that clicks to the timer.

## Task rail refinements
File: `src/components/planner/PlannerTaskPanel.tsx`.
1. Header: title "Tasks" + inline `+ Add a task…` (keep existing NLP quick add) + `Search tasks` input + two buttons Filter / Tags. Filter menu (new `PlannerFilterMenu.tsx`) options: Manual, Priority, Due date, Recently added, Unscheduled, CareFlow area — persisted to `careflow.planner.filter` in localStorage.
2. Reduce dividers — group sections (Inbox, Today, Upcoming, Areas) with surface elevation instead of borders.
3. Task row (`PlannerTaskRow.tsx`): larger 40px tap target, circular check, category dot, icon, title with `line-clamp-3` + "Show more" on click, star action. Subtask progress bar when subtasks exist.
4. Collapsed footer "Completed (n)" at bottom.

## Timeline
File: `src/components/planner/PlannerTimeline.tsx`.
1. Timeline header row: date + weather (`WeatherWidget` compact).
2. Day-period background zones as absolutely-positioned tinted bands behind the grid: Morning (05–12 warm plum), Afternoon (12–17 muted indigo), Evening (17–22 deep violet). Very low opacity so events read cleanly.
3. Current-time indicator: sage 1px line + 6px dot + label chip.
4. Blocks: redesigned pill with category tint fill+border, title, time range, one right-side contextual icon based on area/keywords. Preserve all drag/resize/tap-to-create/duplicate/unschedule handlers. Hover shows action bar (Complete · Focus · Edit · Duplicate · Unschedule · More) as an overlay — no layout shift.
5. Overlapping blocks stay readable: existing column layout kept; tint alpha increased so text meets AA.

### New: period toggle (list view)
- Add `PlannerPeriodTabs.tsx` above the timeline: "Grid · Morning · Afternoon · Evening". Grid is the current timeline. Selecting a period renders `PlannerPeriodList.tsx` — a scrollable list of tasks scheduled in that window (Morning 05–12, Afternoon 12–17, Evening 17–22) using the same block components in list form, with the same drag/edit affordances. Persist to `careflow.planner.period` per view. Does not remove or hide grid features.

### New: Apple-style week view
- Update `PlannerMultiDayView` (or add `PlannerWeekGrid.tsx` selected when `view === "week"`) to render a single shared hour column on the left and 7 day columns sharing one continuous grid — one scroll container, aligned rows, current-time line spanning the current day column only. Day headers sticky at top. Reuse `PlannerTimeline` internals by extracting a `TimelineGrid` primitive that accepts `days: Date[]`.

## Right context rail
File: `src/components/planner/PlannerContextPanel.tsx`.
1. Mini month calendar simplified: strong selected date, small event dots pulled from existing tasks/time_blocks for the month, hover states, today ring, prev/next month.
2. `MoonEnergyCard` — moon visual (SVG), phase name, % illuminated, tri-word mood "Reflect · Release · Realign" derived from phase (helper in `moon-phase.ts`).
3. `TodayIntentionCard` — inline-editable single line, autosave to existing daily-intention store (`src/lib/daily-intention.ts`).
4. `TopPrioritiesCard` — numbered 1/2/3 list from tasks flagged `isTopThree`, drag-reorder (reuse existing top-three helpers), "+ Add priority", cap at 3.
5. Remove Focus Timer duplicate here since Focus lives in the header; keep a compact "Currently focusing" summary when a timer is active.

## Day Pulse (new)
File: `src/components/planner/DayPulseCard.tsx` mounted at the top of the right rail (above mini calendar) or as a slim strip under the timeline header — decide once; plan uses right-rail top for visibility.
- Pure derivation from store: scheduled count, free minutes 6a–10p, overlap count, unscheduled top priorities, completion ratio.
- Status buckets: Soft day / Balanced / Full day / Overloaded with supportive CareFlow copy (constants in `src/lib/planner-day-pulse.ts`).
- When "Overloaded": show "Soften my day" button opening `SoftenMyDayDialog.tsx` — a review list with per-task actions Move / Shorten / Delegate / Remove from today. All changes require explicit confirm; nothing auto-applies. Reuses existing `updateTask` and time-block APIs.

## Carey suggestions (subtle)
- Small dismissible insight strip under timeline header showing at most one contextual line at a time (overlap, open gap, unscheduled priority). Source: `src/lib/planner-day-pulse.ts` derivations — no new AI calls. Dismissals stored per-day in localStorage.

## Sidebar polish
File: `src/components/layout/Sidebar.tsx`.
- Icon + label at ≥ lg widths (labels already exist; tighten spacing, hierarchy). Brand lockup: logo + "CareFlow" + tagline "Plan · Care · Grow".
- Warm outlined "Quick Add" button near bottom that opens `PlannerQuickCapture`.
- "Today Focus" card at the very bottom with three short lines and edit pencil, editable via popover, stored in `ui-prefs` (`todayFocus`). Add a tiny inline SVG botanical accent in the corner — no external image.

## Preservation checklist (must remain working)
- `PlannerTimeline` drag/drop from HTML5 rail + touch drag layer (`planner-touch-drag.ts`).
- Tap-to-create quick add popover on empty grid.
- `time_blocks` ↔ tasks two-way sync path.
- ⌘K command bar, `C` capture hotkey.
- Plan My Day dialog stages (Capture → Anchor → Rhythm → Exhale) — only visual alignment tweaks (background, radius) to match new tokens.
- Task editor style selection.
- Task panel resize + hide toggle, auto-hide for 3-day/week.

## Technical notes
- No schema changes. No new tables. No new secrets.
- New tokens are scoped to `.planner-surface` so Today/Home Reset/etc are untouched.
- New files:
  - `src/components/planner/PlannerRhythmHeader.tsx`
  - `src/components/planner/DayProgressRing.tsx`
  - `src/components/planner/MoonInsightCard.tsx`
  - `src/components/planner/CaptureMenu.tsx`
  - `src/components/planner/PlannerFocusButton.tsx`
  - `src/components/planner/PlannerFilterMenu.tsx`
  - `src/components/planner/PlannerPeriodTabs.tsx`
  - `src/components/planner/PlannerPeriodList.tsx`
  - `src/components/planner/PlannerWeekGrid.tsx` (extract `TimelineGrid` primitive from `PlannerTimeline.tsx`)
  - `src/components/planner/MoonEnergyCard.tsx`
  - `src/components/planner/TodayIntentionCard.tsx`
  - `src/components/planner/TopPrioritiesCard.tsx`
  - `src/components/planner/DayPulseCard.tsx`
  - `src/components/planner/SoftenMyDayDialog.tsx`
  - `src/lib/planner-day-pulse.ts`
- Edited files: `src/pages/Planner.tsx`, `src/components/planner/PlannerTaskPanel.tsx`, `src/components/planner/PlannerTaskRow.tsx`, `src/components/planner/PlannerTimeline.tsx`, `src/components/planner/PlannerMultiDayView.tsx`, `src/components/planner/PlannerContextPanel.tsx`, `src/components/planner/PlannerViewToggle.tsx`, `src/components/layout/Sidebar.tsx`, `src/index.css`.

## Out of scope
- Reworking CalendarV2's planner integration (it reuses these components and inherits improvements automatically).
- Mobile planner layout changes.
- Backend / AI additions beyond derivations from existing store data.
