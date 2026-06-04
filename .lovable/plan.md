## Goal

Three connected refinements:
1. Make the Home page (HomeHub) feel like a polished sibling of Home Reset — same gradient header language, same iconography vocabulary, same warm visual rhythm — and remove the duplicate "Home Reset" title that appears when you switch to the Reset tab.
2. Make the **checklist zones** strip on Home a row of expressive, icon-led tiles (not just text chips).
3. Turn **Maintenance** and **Notes** into intelligent, visually appealing hubs instead of utilitarian lists.

Out of scope: data model changes, new routes, AI provider changes, mobile-nav/sidebar work.

---

## 1. Home page (HomeHub) — visual revamp + double-title fix

**Header & background**
- Replace the current emerald/amber header block with a softer, warmer hero card that mirrors HomeReset's language: rounded-3xl gradient panel (rose → amber → emerald wash), 12×12 icon tile, greeting + date eyebrow + rhythm chips inline.
- Add a subtle ambient background (radial gradient + grain) behind the page so the whole Home view feels unified, not a tab-strip floating on neutral.

**Tab strip**
- Keep the existing 6 tabs but restyle as soft pill cards (matching the "Quick Resets" card style on HomeReset) with a small icon tile + label. Active tab gets the gradient ring/glow treatment HomeReset uses for the current reset card.

**Dashboard hero (default tab)**
- Rework `DashboardHero` to use the exact same gradient/ring/inner-white-card pattern as `CurrentResetHero` for visual continuity. Reuse `HeroStat` styling but reduce to two clean stats + a "next thing" panel.

**Reset tab — double title fix**
- `HomeReset` currently renders its own full header ("Home Reset" + tagline + stat chips + AI/History/New buttons). When embedded inside HomeHub's Reset tab, that header is redundant with the HomeHub greeting header.
- Add an `embedded?: boolean` prop to `HomeReset`. When `embedded`, skip the `<header>` block and instead surface the action buttons (AI generate, History, New reset) as a slim toolbar above the Current Reset hero. HomeHub passes `embedded`.
- Standalone `/home-reset` route (if reachable) still renders the full header — but per `App.tsx` both routes already point to HomeHub, so the standalone path is gone; the prop is for safety + clarity only.

**Checklist zones with icons**
- Promote the existing 6-zone strip (Bedroom/Kitchen/Bathroom/Laundry/Entryway/Living) to a primary section on the dashboard tab as well (not only inside the Reset tab).
- Each tile: gradient background per zone (reuse `KIND_ACCENT`-style palette from HomeReset), 14×14 icon tile, zone label, and a small progress hint ("3 of 5 done today" pulled from the matching `Zone: <label>` checklist when one exists). Tile click opens `/home-areas` (existing behavior) or the zone's checklist sheet if present.
- Extract this into `src/components/home-hub/ZoneTiles.tsx` so HomeHub dashboard + the Reset tab + Zones tab can all share one component.

---

## 2. Maintenance hub — intelligent + visually appealing

Rework `src/components/home-hub/MaintenanceTab.tsx`:

**Top: status hero**
- Gradient card matching HomeReset language showing: overdue count (rose), due-this-month count (amber), upcoming count (sky), and one-line smart prompt ("2 tasks are overdue — start with the HVAC filter, it's the quickest").
- Inline "Next up" CTA that completes the single most-urgent overdue/due-soon item.

**Middle: category grid**
- Replace flat filter pills with a 2–4 column grid of category cards, each with an inferred icon (HVAC → Wind, Lawn → Trees, Plumbing → Droplets, Appliances → WashingMachine, Vehicles → Car, etc. via a small `category-icons.ts` map with a sensible default). Each card shows category name + counts per bucket (overdue/due-soon/upcoming) with the same color language. Clicking a card filters.

**Lists: bucket cards stay, polished**
- Keep the four bucket sections (Overdue / Due Soon / Upcoming / Unscheduled) but render items as compact, icon-led rows with category icon, title, relative due ("in 5 days", "3 days late"), and quick actions (Done, Snooze 1mo, Delete). Add Snooze via `update({ next_due: <+1mo> })`.

**AI panel: smarter framing**
- Keep `useAiSuggest` but move the panel to a collapsed-by-default expandable "Suggest tasks for my home" card under the hero (not the very top), with a one-line teaser when collapsed.

**Add form**
- Collapse into a single "+ Add task" button that opens a compact `Sheet` instead of an always-visible 5-column form, freeing vertical space.

---

## 3. Notes — intelligent hub

Rework the top of `src/pages/Notes.tsx` (keep list/gallery/kanban/calendar views intact):

**Hero strip (above the current toolbar)**
- Gradient hero (paper/ink palette to differentiate from Home rose-amber) with: total notes, notes this week, current writing streak (if `DailyWritingGoal` data is available), and "Today's note" CTA (`getOrCreateDailyNote`).

**Smart shelves (horizontal scroll rows)**
- "Pinned" — pinned notes (already supported via `Pin` icon import).
- "Recent" — last 6 by `updated_at`.
- "Daily notes" — last 7 daily-kind notes.
- "By project" — chips → filters the main view.
Each shelf uses a small note card with cover/icon + title + 2-line preview (via `stripMarkdown`).

**AI quick actions row**
- "Summarize this week", "Suggest a journal prompt", "Find related notes for…" — wired to existing `aiInvoke`. Results render inline in a dismissable card.

The existing search/view/group toolbar, filtered list, and all four view modes remain unchanged below the new hub strip.

---

## Technical details

**New / modified files**
- `src/pages/HomeHub.tsx` — new header & background, pill tab strip, redesigned `DashboardHero`, pass `embedded` to `<HomeReset />`, render `<ZoneTiles />` on dashboard.
- `src/pages/HomeReset.tsx` — accept `embedded?: boolean`; when true, hide header block and render only the AI/History/New buttons in a slim toolbar.
- `src/components/home-hub/ZoneTiles.tsx` *(new)* — reusable icon zone grid, reads `reset.lists` to compute per-zone progress.
- `src/components/home-hub/MaintenanceTab.tsx` — new hero, category grid, snooze action, collapsed AI panel, sheet-based add form.
- `src/lib/category-icons.ts` *(new)* — maps category strings → Lucide icon + tone.
- `src/pages/Notes.tsx` — new hero + shelves + AI actions row; existing logic untouched below.
- `src/components/notes/NotesHub.tsx` *(new)* — the hero/shelves component, kept separate so Notes.tsx stays readable.

**Design tokens**
- All colors via existing Tailwind utilities already in use across HomeReset (rose/emerald/amber/violet/sky/stone at /70 + /40 opacity). No new global tokens; everything stays themed and works in dark mode via existing `bg-card`/`text-foreground` patterns where applicable.

**Risk**
- `HomeReset`'s embedded mode is a pure render change — the `useResetChecklists` hook and all handlers stay identical, so functionality on the Reset tab is unaffected.
- Notes hero is additive; nothing existing is removed.
