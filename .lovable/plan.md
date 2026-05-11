## Goal

Turn the Dashboard, Today, and Week pages into Evernote-style boards where every widget can be dragged, resized, hidden, or added — including free-form note and mini-task widgets — with smooth motion and haptic feedback. Each page keeps its own saved layout.

## Scope (this plan)

Only the customizable dashboard system. Health, Wealth, Home/Chores, and calendar DnD will follow in separate plans.

## What you'll get

- A grid you can rearrange: long-press / grab a widget to move, drag a corner to resize (S / M / L / XL spans).
- An "Edit layout" toggle in the page header. Outside edit mode, widgets behave normally (no accidental drags).
- A "+ Add widget" gallery showing every available widget (existing ones like Top 3, Meals Today, Habits, Weather, etc.) plus new **Note** and **Mini Task List** widget types you can add multiple instances of.
- Hide any widget from its corner menu; bring it back from the gallery.
- Per-page layouts: Home (`/`), Today (`/today`), Week (`/week`) each remember their own arrangement.
- Smooth framer-motion transitions on drag/drop/resize and Vibration API haptics on pickup, snap, and delete (no-ops on unsupported devices).
- Layouts persist per user in the existing `dashboard_layouts` table (one row per page).

## Technical details

**Library**: `react-grid-layout` (responsive, supports drag + resize + serializable layout JSON). Already aligns with our Tailwind setup.

**Data model** — reuse existing `dashboard_layouts` table:
- `name` = page key: `"home" | "today" | "week"`
- `layout` = `react-grid-layout` array `[{ i, x, y, w, h, minW, minH }]`
- `widgets` = `[{ id, type, props, hidden }]` where `type` is a registered widget key (`"top3"`, `"meals-today"`, `"note"`, `"mini-tasks"`, …) and `id` matches `layout[i].i`

**New files**
- `src/lib/dashboard-layouts.ts` — load/save per-page layout, defaults, add/remove/hide helpers.
- `src/lib/haptics.ts` — `tap()`, `pickup()`, `snap()` wrappers around `navigator.vibrate`.
- `src/components/dashboard/WidgetRegistry.tsx` — central map: `type → { title, icon, defaultSize, component }`.
- `src/components/dashboard/CustomizableGrid.tsx` — `react-grid-layout` wrapper, edit-mode chrome (drag handle, resize handle, hide button), framer-motion item transitions.
- `src/components/dashboard/WidgetFrame.tsx` — shared card shell with title, hide/settings menu.
- `src/components/dashboard/AddWidgetSheet.tsx` — gallery sheet to add hidden or new widgets.
- `src/components/dashboard/widgets/NoteWidget.tsx` — rich-ish textarea note (title + body), autosaves to widget props.
- `src/components/dashboard/widgets/MiniTasksWidget.tsx` — small inline checklist stored in widget props.
- Wrappers around existing dashboard sections (Top 3, Meals Today, Habits, Weather, Moon, Pomodoro, Appointments, etc.) so they plug into the registry without duplicating logic.

**Edited files**
- `src/pages/Dashboard.tsx` — replace hand-built grid with `<CustomizableGrid pageKey="home" />`.
- `src/pages/Today.tsx` and `src/pages/Week.tsx` — same treatment with their own `pageKey` and default widget sets.
- `src/components/layout/AppLayout.tsx` — add an "Edit layout" toggle button in the header that's only active on supported pages.

**Dependencies to add**: `react-grid-layout` and its CSS, `@types/react-grid-layout`.

**Defaults**: First load seeds each page with its current widgets in a sensible layout. Migration: a no-op SQL is not needed — `dashboard_layouts` already exists with the right shape. We will only insert default rows on first visit per page.

**Mobile**: Grid uses one column on `<sm` (the current 411px viewport). Drag/resize still works via touch; haptics fire on supported devices.

## Out of scope (future plans)

- Health page (self-care, movement, weight, goal-tailored meals)
- Wealth page (budget, subscriptions, debt, recurring → calendar)
- Calendar hourly DnD (move/resize events, drop tasks to time-block, recurring auto-appear)
- Home cleaning zones / maintenance / documents / per-person chore checklist
