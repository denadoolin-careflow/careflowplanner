# Cleaning & caretaking in the sidebar, sturdier query blocks, zodiac season guide

Three additions to the planner and notes experience.

## 1. Cleaning and Caretaking sections in the planner sidebar

The planner's left task panel currently groups Inbox, Today, Upcoming, Someday, Areas, Projects, Home upkeep, Habits, Routines and Meals. Cleaning and caregiving chores live in separate stores and aren't browsable there.

- Add two new collapsible sections to the sidebar: **Cleaning** and **Caretaking**.
- Cleaning groups by zone (kitchen, bath, bedrooms, etc.), Caretaking groups by recipient/cadence.
- Each row: checkbox with the same complete animation as tasks, title, and a small zone/cadence chip.
- Rows are draggable onto the time grid exactly like tasks, so a chore can be time-blocked.
- Inline quick-add inside each section, with automatic zone inference for cleaning items (typing "unload dishwasher" tags Kitchen).
- Both sections respect the panel's search box, sort control and reader font-size setting.

## 2. Query block settings, resizing and reliable saving

Confirmed issue: when a note is saved, query blocks are converted to markdown and only four attributes survive the round trip — view id, layout, label and filters. Source (tasks / cleaning / caretaking), group-by, sort, limit and column choices are dropped, so a board query re-opens as a plain task list. That is the "queries disappear" behaviour.

Fixes and improvements:

- Persist every query attribute through save/reload, so a block reopens exactly as configured.
- Auto-heal older blocks: if a block points at a saved view, reload the full settings from that view on mount.
- Redesigned settings popover: grouped sections (Source, Filters, Display, Columns), clearer labels, live result count, and a reset button.
- Resizable query block: drag the bottom edge to set height; the block scrolls internally instead of pushing the note. Height is saved with the block.
- Column management: reorder by drag, toggle visibility, and set width per column in table layout.
- Inline editing everywhere — title, choice fields, dates — in list, table and board layouts.
- "Save as view" and "Update view" actions so a tuned query becomes a reusable saved view, plus a quick-swap picker to load a different one.

## 3. Zodiac season planning guide

A new month-level guide driven by the Sun's sign (the solar season), complementing the existing moon-phase guidance.

- New solar-season library covering all twelve signs with: season name and dates, element and modality, core theme, a short planning focus paragraph, 4-6 recommended planning tasks, energy notes (what's easy / what to protect), 3-4 habit suggestions, and seasonal meal/nourishment ideas.
- A **Season guide** card on the planner month view showing the current sign, element, dates, theme and focus, with tabs for Tasks, Energy, Habits and Meals.
- Cusp handling: near a sign change the card shows the incoming season with a "transition" note.
- One-tap actions: add a recommended task to the planner, add a habit suggestion to Habits, add a meal idea to the meal lane.
- A compact zodiac-season chip on the day and week views that opens the full guide.
- Link out to the existing Cosmic Flow section for deeper detail.

## Technical notes

- Sidebar: extend `TaskSourcePanel.tsx` with cleaning/caregiving sections sourced from the existing store actions (`addCleaning`, `toggleCleaning`, `updateCleaning`) and `src/lib/caregiving-chores.ts`; reuse `BlockCheckbox`, the existing drag payload format, and `src/lib/cleaning-zone-infer.ts`.
- Query blocks: widen the turndown rule and `addAttributes`/`parseHTML`/`renderHTML` in `QueryBlockNode.tsx` to cover source, group, sort, limit, columns and height; hydrate from `saved_views` when `viewId` is set. Column/height state stays in the node attrs; saved views keep using the `_runner` payload in `src/lib/saved-views.ts`.
- Zodiac guide: new `src/lib/planner/solar-season.ts` (pure data + a `solarSeasonFor(date)` helper reusing `SIGN_THEMES` from `src/lib/cosmic/copy.ts`), plus `SolarSeasonGuide.tsx` rendered in the month view and a chip in day/week headers. No database changes required.
