# Revamp Home Hub Dashboard + Widget Polish

Make the Dashboard tab inside Home Hub feel like the Home Reset page, fix the "title shown twice" issue on reset checklist widgets, add an auto-arrange action so widgets snap into a clean layout, and let the user pin which tab opens first.

## 1. Dashboard tab → Home Reset visual language

Wrap `CustomizableGrid` inside a new `DashboardCanvas` (or render in place inside `HomeHub.tsx` dashboard branch) with:

- **"Today at a glance" hero card** — same shape and gradient treatment as Home Reset's `CurrentResetHero`: rounded-3xl, kind-tinted gradient, rounded icon tile (`LayoutDashboard`), display heading, soft caption. Inside it: 3 quick stat chips (resets in progress, top-3 done today, next appointment time) and one big CTA "Continue your reset →" that jumps to the Reset tab.
- **Section headers** — reuse Home Reset's `SectionHeader` pattern (display font, bold, optional trailing link) above the grid: "Your widgets" with a trailing "Add widget" button when not editing.
- **Soft section background** — wrap the widget grid in `bg-card/60 ring-1 ring-border/40 rounded-3xl p-3` so it visually anchors instead of floating.
- Move the existing controls row (preset menu, page theme, edit) into a quiet right-aligned strip under the section header.

## 2. Stop the duplicate title

`WidgetFrame` already renders the widget title. Today `HomeResetChecklistWidget` also renders its own header chip ("📋 Weekly reset · 0/3"), which reads as two titles stacked.

Fix:

- Remove the inner `<ListChecks /> {list.name}` chip from `HomeResetChecklistWidget` when there is exactly one list (frame title is enough), and keep only a compact `done/total` counter aligned right.
- When the user has multiple lists, replace the chip with just the list-switcher `<select>` — no icon, no second label.
- Same audit for `HomeResetQuickWidget` and `WeeklyResetWidget` — if any of them render an internal title row, collapse it to a single compact meta row (progress + small action only).

## 3. Auto-snap / Auto-arrange

`react-grid-layout` already snaps on drop. What's missing is a way to recover from messy layouts without manual dragging.

Add:

- **"Auto-arrange" action** in the controls strip (icon `Wand2`). Calls a new `compactLayout(items)` helper that re-flows widgets row-by-row by reading order, packs them left-to-right at the current breakpoint's column count, and clamps each widget to its `defaultSize` if it has been resized below its `minW/minH`. Pipes the result through `updateLayout`.
- **Snap on add** — when a new widget is added via `addWidget`, immediately run the same packer so it lands in the first open slot instead of always at the bottom.
- **Snap on hide/remove** — after removing/hiding a widget, call the packer once so the remaining widgets collapse the gap.
- Keep `compactType="vertical"` and `preventCollision={false}` as today; the new helper just enforces a clean state up front.

## 4. Pick which tab opens first

Add a default-tab preference for the Home Hub tab strip:

- New helper `src/lib/home-hub-prefs.ts` with `getDefaultHomeHubTab()` / `setDefaultHomeHubTab(tab)` backed by `localStorage` (key `careflow:home-hub-default-tab`).
- `HomeHub.tsx` initial `useState<TabId>` reads from this helper (falling back to `"dashboard"`).
- Each tab pill gets a small pin button revealed on hover/long-press (icon `Pin` / `PinOff`). Tapping pins/unpins that tab as the default; toast confirms. Active pinned tab shows a tiny dot indicator on the pill.
- No backend change — preference is per-device, which matches existing dashboard preset behavior.

## Files

- **Edit** `src/pages/HomeHub.tsx` — dashboard branch wrapped in new hero + section frame; pin button on tab pills; read default tab on mount.
- **Edit** `src/components/dashboard/CustomizableGrid.tsx` — accept optional `hero` slot, add Auto-arrange button, call packer on add/hide/remove.
- **New** `src/lib/dashboard-pack.ts` — `compactLayout(items, cols)` packer.
- **Edit** `src/components/dashboard/widgets/HomeResetChecklistWidget.tsx` — drop duplicate header chip.
- **Edit** `src/components/dashboard/widgets/caregiver/HomeResetQuickWidget.tsx` and `DashboardWidgets.tsx` (WeeklyReset) — same dedup pass.
- **New** `src/lib/home-hub-prefs.ts` — default-tab preference.

No DB changes, no new dependencies.
