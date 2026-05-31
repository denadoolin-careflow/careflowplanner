## Goal

Strip the app down to a calm, feed-first mobile layout that works one-handed. Replace today's dense multi-row headers and overlapping FAB with a quiet two-row header, an inline composer, a single chip lane, and hairline-divided task rows. Carry CareFlow's existing sage / plum / cream atmosphere tokens, keep all features intact, and prioritize emotional clarity over information density.

## Visual language

Base reference: "Soft organic" prototype (v2) — inline composer, hairline task rows, slim bottom nav.

Adopted from "Serene minimalist" (v1): generous spacing on every row, larger tap targets, soft tactile press states, haptic on every confirm action.

Tokens (existing in `index.css` stay the source of truth; we only adjust how they're applied):
- Cream surface for daylight reads, deep plum/charcoal for night atmospheres — driven by the active atmosphere, not hard-coded.
- Hairline dividers replace card borders and section panels.
- Type: Instrument Serif for page titles, the project's existing sans for body — applied via a new `--font-display` token.
- Radius: tighten to 16px (rows), 20px (composer), full-pill chips.
- Min tap target: 44×44.

## Structural changes (app-wide)

1. **Top bar** — One row, ~52px tall: menu, brand mark, search icon. No bell, no theme toggle, no AI sparkle, no sidebar toggle, no second-row routine pill. Notifications and theme move into the side menu. Routine selector moves into the page header as a small inline pill under the title.

2. **Page header** — Single row: serif title + count, one trailing action (the page's primary verb: search on Inbox, today's date on Today, etc.). Removes Select / Smart triage / view toggles from the always-visible header.

3. **Action toolbar** — Replaced by a single overflow "More" sheet behind the trailing icon. Select / Smart triage / Group / Filter / Sort / View all live inside that bottom sheet. Default view always opens with zero toolbar chrome visible.

4. **Composer** — Inline card directly under the header. Single text input, expandable to reveal Date / Project / Area / Template buttons only after focus. Capture button always pinned right.

5. **Chip row** — One horizontally scrollable lane, no wrap, no "All" floating right. Selected chip uses the atmosphere accent. Thin scrollbar removed entirely (touch scroll only).

6. **Task rows** — Hairline-divided, no card backgrounds, no drag handle by default (revealed on long-press). Row: large circular checkbox (28px), title (15–16px), one meta line (area · time). Status dot and project icon collapse into a single leading accent dot colored by area. Tags collapse to first 1 + "+N".

7. **Bottom nav** — Slim, white/cream surface, icon + 10px label. Active item uses atmosphere accent (no pill background). FAB removed — primary add lives in the inline composer; secondary quick-add accessible via long-press on the active tab.

8. **Sheets & menus** — All overflow moves to bottom sheets (already in shadcn). Side menu becomes the home for Notifications, Theme, Search history, Account.

## Per-screen application

- **Inbox** — Composer + chips + feed (canonical reference).
- **Today** — Same header pattern; feed grouped by Morning / Afternoon / Evening with hairline section labels.
- **Calendar** — Header keeps date label only; view toggles (day/week/month) move into the "More" sheet. Mobile defaults to agenda feed.
- **Routines** — Header + chip row for time-of-day; routine cards become hairline feed rows.
- **Notes** — Header + single chip row for area; note rows match task row rhythm.

## Files to touch

- `src/components/layout/TopBar.tsx` (or equivalent) — collapse to one row, move overflow into menu.
- `src/components/layout/PageHeader.tsx` / `SectionCard.tsx` — single-row header, trailing action slot, "More" sheet trigger.
- `src/components/layout/BottomNav.tsx` — slim variant, accent active state, drop FAB.
- `src/components/cards/TaskRow.tsx` — hairline variant, larger checkbox, collapsed meta line, leading accent dot.
- `src/components/tasks/QuickCapture.tsx` (composer) — collapsed default, focus-expand for Date/Project/Area/Template.
- `src/components/tasks/FilterChips.tsx` — single lane, no wrap, hidden scrollbar, atmosphere accent.
- `src/pages/Inbox.tsx`, `Today.tsx`, `CalendarPage.tsx`, `Routines.tsx`, `Notes.tsx` — adopt new header/composer/chip pattern; remove inline toolbar rows.
- `src/components/sheets/MoreActionsSheet.tsx` (new) — houses Select, Smart triage, Group, Filter, Sort, View.
- `src/index.css` — add `--font-display`, tighten radius tokens, add hairline divider token. No new colors; reuse existing atmosphere tokens.
- `tailwind.config.ts` — register `--font-display` and new radii.

## Interaction & feedback

- Haptic `tap` on: checkbox toggle, chip select, tab switch, sheet open, capture submit.
- Press states: row scales to 0.99, composer ring becomes accent on focus.
- Long-press on row reveals drag handle + quick actions (snooze / move / delete).
- Swipe-left on row → snooze; swipe-right → complete (already partially implemented; standardize across screens).

## Out of scope

- Color palette changes (atmospheres stay).
- Data model, sync, or feature additions.
- Desktop layout — desktop keeps its current chrome; all changes are mobile-first and gated `sm:` where needed.
- Onboarding, auth, settings screens (separate pass).

## Verification

At 390px viewport on Inbox, Today, Calendar, Routines, Notes:
- Top bar is one row, ≤56px.
- Page header is one row, count visible.
- No floating FAB overlaps content.
- Chip row never wraps and has no visible scrollbar.
- Task rows are hairline-divided with ≥44px touch targets.
- Bottom nav is ≤64px including safe-area.
- All previously available actions are still reachable via the "More" sheet or side menu.
