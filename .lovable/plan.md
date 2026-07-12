# Integrate Planner into Calendar (Today · Week · Month)

Make the Planner workspace the single, canonical calendar surface across all three time scopes and retire the older calendar routes.

## 1. Routing consolidation

In `src/App.tsx`:
- Point `/calendar`, `/calendar-v2`, `/week`, `/month` at the Planner page, forwarding the scope via URL.
- Keep `/planner` and `/planner/:date` working.
- New shape:
  - `/planner`, `/planner/:date` → Planner (Day by default, respects saved view)
  - `/calendar`, `/calendar/:date` → Planner (same component)
  - `/week`, `/week/:date` → Planner locked to Week view
  - `/month`, `/month/:date` → Planner locked to Month view
- Old `CalendarPage` and `CalendarV2` imports removed. Files kept on disk but unlinked (safe to delete later).

In `src/lib/nav.ts`:
- Collapse duplicate PlanFlow entries: keep `Today`, `Planner`, `Week`, `Month`, `Year`. Remove the separate `Calendar` and `Daily Plan` items (now covered by Planner).
- Mobile nav: replace `/calendar` with `/planner`.

## 2. Planner scope awareness

In `src/pages/Planner.tsx`:
- Detect scope from the current route (`/week` → week, `/month` → month, else use stored view).
- When mounted under `/week` or `/month`, force the corresponding `PlannerViewToggle` value and persist it as the user changes it, so navigating back to `/planner` remembers their pick.
- Header title adapts: "Week of Nov 10" / "November 2026" / "Monday, Nov 10".
- Prev/Next buttons step by day / week / month based on active scope.

Auto-hide task panel behavior stays as-is (already collapses in 3-day/Week; extend to Month).

## 3. Bring Calendar V2 goodies into Planner

Port the useful pieces from `CalendarV2` so nothing is lost when it's retired:

- **Carey suggestions + Recovery strip** — render above the timeline in Day view only. Reuse `CareySuggestions.tsx` and `RecoveryStrip.tsx` unchanged.
- **Plan My Day wizard** — already in Planner, keep.
- **Quick Capture (C)** — already in Planner, keep.
- **Command Bar (⌘K)** — already in Planner, keep. Add commands for jumping to Week/Month scopes.
- **Universal Inbox** drag source — Planner's task panel already covers this; no port needed.

Family lanes, Flow stages ribbon, and Time containers from Calendar V2 are **not** carried over (out of scope for this integration; can be revisited later).

## 4. Shared date navigator

Ensure the Planner header's Day/Week/Month toggle + date picker + Today button work identically across the three routes so the nav feels unified. The `PlannerViewToggle` becomes the single scope switcher.

## 5. Files touched

- `src/App.tsx` — route rewiring
- `src/lib/nav.ts` — nav cleanup
- `src/pages/Planner.tsx` — scope-from-route, header labels, prev/next stepper, mount Carey + Recovery in Day view
- `src/components/planner/PlannerCommandBar.tsx` — add Week/Month scope commands

## Out of scope

- Deleting `CalendarPage.tsx`, `CalendarV2.tsx`, `Week.tsx`, `Month.tsx` source files (left in repo, unreferenced).
- Family lanes, Flow stages, Time containers.
- Any backend or data-model changes.
