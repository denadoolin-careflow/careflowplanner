## Home Areas → Command Center Grid

Convert the current long vertical stack (Reset → Zones → Maintenance → Docs → Notes → Chores) into a three-pane layout that matches the picked prototype. All colors and fonts stay on the existing atmosphere tokens (no hard-coded `#738678`/`stone-*` — the prototype colors get translated to `bg-primary`, `text-muted-foreground`, `bg-card`, `border-border`, etc.).

### Layout (desktop ≥ lg)

```text
┌──────────────┬─────────────────────────────┬──────────────┐
│  Sub-nav     │  Section header (sticky)    │  Summary rail │
│  (w-56/64)   │  ───────────────────────    │  (w-72/80)    │
│  Reset  ●    │  Section content            │  Today %      │
│  Zones       │  (grid of cards)            │  Next due     │
│  Maintenance!│                             │  Recent docs  │
│  Documents   │                             │               │
│  Notes       │                             │               │
│  Chores      │                             │               │
└──────────────┴─────────────────────────────┴──────────────┘
```

Below `lg`: sub-nav collapses to a horizontal segmented control at the top; right rail moves to the bottom of the pane.

### Section sub-nav (left)
- Items: Reset, Zones, Maintenance, Documents, Notes, Chores.
- Each row: icon + label + count/urgency badge on the right (e.g. Maintenance shows red `1` when overdue).
- Active item filled with `bg-primary text-primary-foreground` and a soft shadow; inactives use `text-muted-foreground` with `hover:bg-accent/40`.
- Persist active section in URL (`?section=zones`) and `localStorage` so refresh restores it.

### Section header (sticky, top of main pane)
- Title + one-line meta ("4 areas need attention today").
- Right side: existing per-section actions (Add Zone input, AI, Save-as-template) collapsed into a "Quick add" primary button + overflow menu, so every section shares the same header shape.

### Main content pane
- Renders exactly one of the existing section components at a time (Reset panel, ZonesPanel, Maintenance, DocumentsPanel, Notes, Chores) instead of stacking them all.
- Zones/Reset render as a responsive 2-col grid of `Card`s matching the prototype (title, "last reset X ago", `n/total` chip, 3 preview items, "View full checklist" button).
- Empty state: soft dashed card that opens the section's create flow.

### Right summary rail
- **Today's Progress**: aggregated done/total across today's Reset + Chores; primary-tinted bar + percentage.
- **Upcoming Maintenance**: next 2 items from `home_maintenance` sorted by due date; red tint when overdue/≤7d.
- **Recent Documents**: last 2 rows from the documents table.
- Rail is collapsible via a chevron button; state persisted.

### Technical details
- New file `src/pages/HomeAreas.tsx` becomes a thin shell that composes:
  - `src/components/home-areas/SectionNav.tsx` — left sub-nav, active state driven by a `section` search param.
  - `src/components/home-areas/SectionHeader.tsx` — shared sticky header + quick-add slot.
  - `src/components/home-areas/SummaryRail.tsx` — right rail with the three summary sections, collapsible.
- Existing section bodies (`ZonesPanel`, reset checklists, maintenance, docs, notes, chores) move into `src/components/home-areas/sections/*.tsx` — logic unchanged, only the outer `SectionCard`/spacing wrapper is replaced.
- Card visuals use existing shadcn `Card`, `Button`, `Progress`, `Badge`; all colors via semantic tokens (`bg-card`, `border-border`, `bg-primary`, `bg-destructive/10`).
- No schema changes. No backend changes. Read paths for the summary rail reuse existing queries (add small helpers only if a query doesn't exist yet).
- Mobile: `SectionNav` renders as a horizontal scrollable pill row; `SummaryRail` renders below the main pane.
- Keep current keyboard shortcuts and any drag-and-drop behavior inside the section bodies.

### Out of scope
- No changes to the app-level left sidebar or top nav.
- No new color palette or typography.
- No changes to database, RLS, or edge functions.
