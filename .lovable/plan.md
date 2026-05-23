# Home Management System — Phased Plan

Replace `/home-reset` with a unified **Home Hub** that grows over 5 phases. Each phase ships independently; nothing breaks between them. Existing pages (HomeAreas, Routines, Meals, Caregiving, Cleaning) stay intact and are surfaced as widgets/links.

---

## Phase 1 — Home Hub foundation + Dashboard + Maintenance (this turn)

**Route:** `/home-reset` becomes the new Home Hub (sidebar label "Home"). Old reset checklist becomes one widget inside it.

**Layout:**
- Calm header: greeting, date, weather + moon, rhythm hint, quick "Add" menu.
- Tab strip: **Dashboard · Rhythm · Reset · Zones · Maintenance · Analytics**
- Phase 1 implements Dashboard + Maintenance tabs; other tabs render "Coming next" placeholders so users see the roadmap.

**Dashboard widgets (draggable via existing `CustomizableGrid` with `pageKey="home-hub"`):**
- Today's Home Tasks (filter tasks where area in Home/Meals/Caregiving + due today)
- Cleaning Zones (snapshot from `cleaning_tasks` grouped by zone, progress bars)
- Laundry Status (zone="Laundry" tasks, with quick-cycle "Wash → Dry → Fold" buttons)
- Today's Meals (from `meals` table)
- Grocery List (top unbought items)
- Weekly Reset (old reset checklist, compact)
- Upcoming Appointments (next 7 days)
- Family / Caregiving (recipients + today's care notes)
- Home Maintenance Due (next 30 days from new tracker)
- Routines (RoutinesStrip)
- Weather + Rhythm (existing components)
- AI Suggestions card (Phase 4 will wire AI; Phase 1 ships static "Pick a low-energy reset" CTAs)

**Maintenance tracker UI** (new `src/pages/home-hub/MaintenanceTab.tsx`):
- Uses existing `home_maintenance` table (already has title, category, interval_months, next_due, last_done, notes).
- Add / edit / delete tasks via inline composer + edit dialog.
- Group by status: **Overdue**, **Due soon (≤30d)**, **Upcoming**, **No schedule**.
- "Mark done" → sets `last_done = today`, recomputes `next_due` from interval.
- Filter by category. Recurring interval picker (1, 3, 6, 12 months + custom).

**Mobile-first:** sticky tab strip, large touch targets, one-handed bottom-of-screen quick add (reuses existing `QuickAddFab`).

---

## Phase 2 — Daily Home Rhythm planner
- Tab "Rhythm": Morning / Afternoon / Evening / Night Reset columns.
- Drag chores, routines, meals, caregiving tasks between slots.
- Persist assignments via new `home_rhythm_assignments` table (date, slot, item_type, item_id).
- Quick-add chips and time estimates per slot.

## Phase 3 — Weekly Reset workflows + Cleaning Zones
- Tab "Reset": templated weekly reset flows (Laundry, Grocery plan, Budget check, Meal prep, Family prep, Cleaning rotation).
- Recurring template editor; "Generate this week" creates dated checklist.
- Tab "Zones": visual zone grid (Kitchen, Bathrooms, Bedrooms, Laundry, Outdoors, Living Room, Playroom) with progress, drag tasks between zones, subtask checklists.

## Phase 4 — AI Home Assistant
- New edge function `ai-home-assistant` using Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Prompts: "Create low-energy reset", "Help me catch up this week", "Sunday reset", "What matters most today?"
- Returns structured task lists that drop into Rhythm/Reset.

## Phase 5 — Analytics + polish
- Tab "Analytics": completion heatmap, zone consistency, caregiving load, weekly rhythm overview.
- Reuse existing chart patterns.
- Final mobile polish, haptics, swipe gestures.

---

## Technical Notes (Phase 1)

**New files:**
- `src/pages/HomeHub.tsx` — replaces HomeReset content; tab shell.
- `src/components/home-hub/HomeHubHeader.tsx`
- `src/components/home-hub/HomeHubTabs.tsx`
- `src/components/home-hub/MaintenanceTab.tsx`
- `src/components/home-hub/MaintenanceItemRow.tsx`
- `src/components/home-hub/MaintenanceEditor.tsx`
- `src/lib/home-maintenance.ts` — fetch/CRUD hook for `home_maintenance` table.
- `src/components/dashboard/widgets/HomeHubWidgets.tsx` — new widget components:
  - `TodayHomeTasksWidget`, `CleaningZonesWidget`, `LaundryStatusWidget`,
  - `TodayMealsWidget`, `GroceryQuickWidget`, `WeeklyResetWidget`,
  - `UpcomingAppointmentsWidget`, `FamilyCaregivingWidget`,
  - `HomeMaintenanceDueWidget`, `RoutinesWidget`, `WeatherRhythmWidget`,
  - `AISuggestionsWidget` (static CTAs in P1).

**Modified files:**
- `src/App.tsx` — `/home-reset` now renders `HomeHub`. Keep route path so existing sidebar links work; add alias `/home` → same component.
- `src/components/dashboard/WidgetRegistry.tsx` — register new widgets under `home-hub` pageKey.
- `src/components/dashboard/CustomizableGrid.tsx` — already supports per-pageKey layouts; just pass `pageKey="home-hub"` with curated default layout.
- `src/lib/dashboard-layouts.ts` — add default layout for `home-hub`.
- `src/components/layout/Sidebar.tsx` — rename "Home Reset" → "Home" (verify item exists).
- `src/index.css` — no new tokens; reuse sage/tan/cream/plum palette.

**No DB migration needed for Phase 1** — uses existing tables (`home_maintenance`, `cleaning_tasks`, `tasks`, `meals`, `grocery_items`, `appointments`, `care_recipients`, `routines`). Phase 2 will add `home_rhythm_assignments`.

**Branding:** keeps CareFlow's sage/tan/cream/plum, rounded `cozy-card` shells, `gradient-warm` headers, soft shadows. No new colors introduced.

---

After you approve, I'll implement Phase 1 in one pass. Phases 2–5 ship in subsequent turns as you're ready.
