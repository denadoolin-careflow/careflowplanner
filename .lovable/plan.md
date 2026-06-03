## Goals

1. Stop the Inbox capture pill row from extending past the window.
2. Tighten the collapsed sidebar so every icon tile is the same size, perfectly centered in the rail, and the hover background hugs the icon area (no wider-than-icon hover).

## 1. Inbox capture row (`src/components/tasks/InlineTaskComposer.tsx`)

Today the row uses horizontal scroll with a hidden scrollbar (`overflow-x-auto`), so pills overflow off-screen with no visible affordance. Two simple changes:

**a. Wrap instead of scroll.**
- Swap the pill container from `overflow-x-auto … flex` to `flex flex-wrap items-center gap-1.5`.
- Remove the `-mx-1 px-1 pb-1 scrollbar-none …` overflow styling and the `shrink-0` on every pill (no longer needed once wrapping is allowed).

**b. Reduce pill count.**
- **Merge low / med / high into a single "Energy" popover pill** (icon: `Zap`, label "Energy" → reflects selection: "Low" / "Med" / "High" with the same active soft-color background as today). Popover options: Low, Medium, High, Clear.
- **Group secondary pills behind a "More" popover** — keep visible: `Describe`, `Date`, `Project`, `Area`, `Priority`, `Energy`. Move `Time of day`, `Tag`, `Est` into a `More ▾` popover that lists them as rows (icon + label + their existing popover content opens on click via a nested popover or inline expander).
- Keep the bottom-right actions row (`Template`, `Add`) unchanged.

Net effect: pills wrap inside the card on narrow widths and never overflow the window, and the visible set drops from ~11 to 7 controls.

## 2. Sidebar rail alignment (`src/components/layout/Sidebar.tsx`)

The collapsed rail is `w-[68px] p-3` (= 44px inner) while icon tiles are `h-10 w-10` (40px) — 2px of slack per side that drifts depending on which section's wrapper is used (`mx-auto` in Lists vs `flex flex-col items-center` in tag/notes sections vs no wrapper for project rail items). The collapse/theme/sliders buttons in the header are `h-7 w-7`, which makes them look smaller than the body tiles and visually off-center.

**a. Normalize rail dimensions.**
- Change collapsed rail from `w-[68px] p-3` to `w-14 px-2 py-3` (56px wide, 8px horizontal padding → exactly centers a 40px tile).
- Set every collapsed section's wrapper to `flex flex-col items-center gap-1` so the children sit on the rail centerline regardless of section.

**b. Unify the tile size.**
- Add a tiny `RailTile` className constant: `grid h-10 w-10 place-items-center rounded-xl transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`.
- Apply it to:
  - `LISTS.map(...)` NavLink (currently `justify-center h-10 w-10 mx-auto`)
  - `PinnedTagsSection` collapsed NavLink
  - `PinnedNotesSection` collapsed NavLink
  - Calendar (`week`/`month`) collapsed rail items
  - The project-rail collapsed nodes inside `renderProjectNode` (currently render full row even when collapsed — replace with a 40×40 tile that shows the project icon only).
- Active state stays the same (`bg-primary-soft text-foreground shadow-soft`).

**c. Align the header chrome in collapsed mode.**
- In collapsed mode, hide the header utility buttons (theme cycle, side flip, sliders) — they don't fit a 40px tile cleanly and only show on `lg:` anyway.
- The logo (`h-9 w-9`) and the collapse toggle (`h-7 w-7`) are bumped to `h-10 w-10` so they sit on the same grid line as the nav tiles. Header switches to `flex flex-col items-center gap-1` when collapsed.

After this, every clickable area in the collapsed rail is exactly 40×40, centered horizontally inside the 56px rail, and the hover background never extends past the icon's tile.

## Out of scope

- No changes to expanded-sidebar layout, project tree behavior, or DnD.
- No new dependencies, no design tokens added — only Tailwind class adjustments and the one Energy/More popover refactor in the composer.
