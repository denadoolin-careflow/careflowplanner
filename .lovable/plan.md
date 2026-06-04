## Goal

Let each flow's landing page (`/flow/{id}`) be pinned as a navigable icon in the three nav surfaces — bottom nav, More sheet, and sidebar — so users can jump straight to a flow's hub.

## Approach

### 1. Expose flow landings as nav destinations

In `src/components/layout/BottomNav.tsx`, extend `ALL_DESTINATIONS` to include one synthetic entry per `NAV_GROUPS` item:

```
{ to: `/flow/${group.id}`, label: group.label, icon: group.icon }
```

These show up automatically in the existing **Customize bottom nav** picker, so the user can pin any flow into one of the 6 bottom-bar slots and reorder it like any other destination. Bottom-bar tiles render with the flow's accent color (via `flowAccents`).

### 2. More sheet: per-flow "Pin" toggle

In the More sheet's flow sections (BottomNav `NAV_GROUPS.map`), add a small bookmark/pin button on the right of each flow header (next to `ArrowRight`). Tapping it pins/unpins `/flow/${id}` in `navIds` (cap at 6, toast when full). Visual state: filled icon when pinned, outline when not.

### 3. Sidebar: pin flow to top rail

Add a new persisted preference `careflow:sidebar:pinned-flows` (string[] of group ids). In `src/components/layout/Sidebar.tsx`:

- Collapsed rail: render the pinned flows' icons as 40px tiles in a dedicated section above the existing flow groups (same tile style as Lists/pinned-tags rail, with the accent dot we already added).
- Expanded rail: render compact rows (icon + label) above the group list.
- Each flow group header gets a tiny pin toggle button (visible on hover) that adds/removes the group from the pinned list.

State syncs across mounts with the same custom-event pattern used for `mobile-nav-order` and `sidebar:prefs`.

### 4. Storage & defaults

- Bottom nav: no schema change — picker now lists flow entries by default.
- Sidebar: new key `careflow:sidebar:pinned-flows` defaults to `[]`.
- Both stores listen for their own `storage`/custom events so all open tabs/components stay in sync.

## Out of scope

- New flow landing page content.
- Reordering flow groups themselves (already drag-drop in sidebar).
- Cross-surface sync between the bottom-nav pinned set and the sidebar pinned set — they stay independent so mobile and desktop can be configured separately.

## Deliverable

- BottomNav: flow landings appear in the customize picker; pin toggle in More sheet.
- Sidebar: pinned-flow rail (collapsed + expanded) with per-group pin toggle.
- All choices persisted in localStorage and synced across mounted instances.
