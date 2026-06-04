# Collapsed sidebar polish — consistent 48×48 rail with calm rhythm

The collapsed rail today mixes 40×40 buttons, 18px icons, a floating dot indicator in the top-right of group heads, and inconsistent gaps. The goal is one disciplined 4px grid: every collapsed control is the same square, every icon the same size, every group separated the same way, and the rail behaves the same on mobile, tablet, and desktop.

## 1. One shared collapsed button

Add a single `CollapsedIconButton` helper (defined inline in `Sidebar.tsx`) used everywhere in the collapsed rail:

- `48×48` square, `rounded-xl`, `grid place-items-center`.
- Icon slot is a fixed `24×24` inner span, `<Icon className="h-5 w-5" />` (20px stroke icon centered in a 24px box reads as the 24px target without overpowering a 48px button — matches Linear/Things).
- Hover: `bg-sidebar-accent` only; no scale, no translate, no padding change — zero shift.
- Active: `bg-primary-soft text-foreground shadow-soft` + a 3×16 rounded accent bar absolutely positioned on the leading edge (`left-0 top-1/2 -translate-y-1/2`); the bar uses the item's accent color so the dot-in-corner indicator disappears (which is what currently causes the visual wobble on group heads).
- Optional `accentColor` prop tints the icon itself for the Things-style LISTS row.

Replace the inline `cn(... "h-10 w-10" ... "h-[18px] w-[18px]" ...)` blocks in:

- LISTS rail (lines ~915–948)
- Group-head NavLink (lines ~1207–1224) — drop the absolute corner dot
- Group child NavLinks (lines ~1225–1239)
- `PinnedNotesSection` collapsed branch (lines ~392–417)
- `PinnedTagsSection` collapsed branch (lines ~287–315)
- Header "expand sidebar" toggle (lines ~900–910)
- Logo wrapper (becomes a 48×48 mark cell)

## 2. Fixed rail width on a 4px grid

`w-14` (56px) currently leaves 8px around a 40px button. Change collapsed rail to `w-16` (64px) with `px-2 py-3`, giving exactly 8px on either side of a 48px button so every icon sits on the same vertical axis. Update both the inline class on line 801 and the `aside` so the outer width matches (the outer `style={{ width }}` is already skipped when collapsed, so the inner `w-16` governs).

Center wrapper for collapsed nav: `flex flex-col items-center gap-1.5 w-full`.

## 3. Visual rhythm — sections + dividers

Keep the existing `NAV_GROUPS` taxonomy (PlanFlow, CareFlow, HomeFlow, …) — they're already grouped semantically. In the collapsed branch only:

- Replace the per-group `mb-3` with a uniform `gap-1.5` between buttons and an explicit `<SidebarRailDivider />` between groups (`h-px w-6 mx-auto my-2 bg-sidebar-border/40`).
- Insert the same divider once between (a) the LISTS rail and the first group, and (b) before the settings group at the end.
- Drop the per-group accent-tinted top-right dot — accent now lives on the active bar so groups don't visually compete.

No change to `NAV_GROUPS` content or order.

## 4. Top + bottom anchoring

The outer `SidebarBody` flex container already has `h-full flex-col`. Wrap the nav contents in two regions:

- `<div className="flex-1 min-h-0 overflow-y-auto">` — logo + LISTS + pinned + groups.
- `<div className="mt-auto pt-2 flex flex-col items-center gap-1.5">` — collapsed-only footer with: theme cycle button, side-swap button, settings link, and the collapse/expand toggle, each rendered through `CollapsedIconButton`.

When expanded, the footer block remains the existing inline header controls (no change). The split only activates `if (collapsed)`.

## 5. Mobile & tablet

The collapsed rail is desktop only (`hidden lg:flex` on the outer `<aside>`). The mobile drawer (`MobileSidebarTrigger`) renders `<SidebarBody forceExpanded />`, so the collapsed math never touches mobile — no regression risk there. Verify by inspection only; no code change required for mobile.

## 6. Hover/animation contract

- All collapsed buttons: `transition-colors duration-150` only. No `transition-all`, no width/transform animations.
- Tooltips stay `delayDuration={150}`, side="right".
- The active accent bar fades in via `transition-opacity` so route changes don't snap.

## Out of scope

- No changes to expanded sidebar styling.
- No restructure of `NAV_GROUPS` or the area/project tree (already hidden when collapsed).
- No new pref toggles.
- Astrology/quick-dates sections continue to be hidden when collapsed.

## Files

- edit only: `src/components/layout/Sidebar.tsx`

## Acceptance checks

- All collapsed buttons measure 48×48 in DevTools; every icon centers on the same x-axis.
- No layout shift between hover and active states (verified by toggling routes).
- Group heads no longer show a floating top-right dot; active state reads as a left-edge bar.
- Footer (theme, side, settings, collapse) is anchored to the bottom of the rail.
- Rail width is exactly `64px` collapsed.
