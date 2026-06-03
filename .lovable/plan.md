## Goal

Unify the Home Hub around the look/feel of the new Home Reset page, level up every reset interaction (timer, smart next step, history, one-tap complete with confetti, quick-reset toggle), and rebuild Zones as beautiful, editable, schedulable checklists. Also collapse the legacy `/dashboard` Home into Home Hub so there's one home.

---

## 1. Reset experience upgrades (Home Reset hero + sheet)

**Reset timer** — In `CurrentResetHero`, when "Continue Reset" is pressed start a soft inline countdown using the current task's `est_minutes` (fallback 5 min). Reuses existing `pomodoro-store` (already wired in `QuickTimerMenu`) so the floating timer + chime keep working. Show a tiny "5:00 · pause · skip" strip below the "Next up" row. Pressing complete advances + chains into next task.

**Smart next step** — Replace simple `find(!done)` with a scorer that prefers items that:
1. match `time_block` for current hour (morning/afternoon/evening),
2. match `day_of_week` for today,
3. have the lowest `est_minutes` when user is in low-energy mode (`state.settings.lowEnergyMode`),
4. otherwise lowest `sort_order`.
Surface a tiny "Picked because: morning · 5 min" caption under the next-step row.

**One-tap complete with confetti** — Add a single big checkbox/disk on the "Next up" row. On tap: `haptics.success()`, mark done, fire confetti burst (use lightweight inline canvas — small helper `src/lib/confetti.ts`, ~40 lines, no new dep), play optional chime via existing `completion-sound.ts`, then auto-advance to the next smart pick. Hero shows "Beautifully done ✨" celebration state when list completes.

**Reset history** — New table `reset_history` (one row per item completion: `checklist_id`, `item_id`, `title`, `completed_at`, `duration_seconds`). Logged automatically on toggle-done. New `ResetHistorySheet` (opened from a "History" button on hero) shows last 7 days grouped by date with checklist + duration; total reset streaks at top.

**Quick-reset toggle** — `QuickResetCard` gets a new top-right toggle pill ("Show tasks ▾"). Toggling reveals an inline collapsed compact checklist (checkbox + title, no metadata) right inside the card — taps mark done immediately. Double-click still opens the full editor sheet. This makes a quick reset literally a tap-to-toggle list, no sheet required.

---

## 2. Unified Home Hub (kills `/dashboard` Home)

- `/dashboard`, `/home`, `/home-reset` all render `HomeHub`. Remove separate `Dashboard.tsx` route (kept file as redirect to `/home`).
- `HomeHub` keeps the existing 6-tab strip (Dashboard / Rhythm / Reset / Zones / Maintenance / Analytics) but the **Dashboard tab now embeds the greeting/clock/energy hero from old `Dashboard.tsx`** + the existing `CustomizableGrid pageKey="home"` so nothing is lost.
- Header band of `HomeHub` matches the Home Reset header style (rounded icon tile + display heading + stat chips), replacing the current `gradient-sage` slab so the whole hub feels consistent.

---

## 3. All Home Hub tabs match Home Reset style

Apply a single visual language to `RhythmTab`, `MaintenanceTab`, `ZonesTab`, `AnalyticsTab`:

- Same `SectionHeader` (display, bold, trailing link) as Home Reset.
- Replace ad-hoc `SectionCard` panels with the soft `rounded-3xl bg-gradient-to-br … ring-1 shadow-soft` card pattern, using the same KIND_ACCENT palette (sage/blush/plum/cream/gold) per section.
- Icons standardized — every panel/widget gets the rounded 12 tile + lucide icon used on Dashboard widgets and Home Reset hero.
- Cards use the same `bg-card/80 ring-1 ring-border/50 backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-soft` pattern.

---

## 4. Unified Checklist UI everywhere

Reset checklists, Zone checklists, and Rhythm slots currently render with three different UIs. Standardize on `ChecklistTree` (used in the Reset sheet) wherever a list of tasks is shown inside Home Hub:

- New thin wrapper `ChecklistInline` (compact, no drag handles) for in-card use (Quick Reset cards, Zone cards).
- Open-in-sheet uses the full `ChecklistTree`.
- All checkbox toggles share the one-tap-complete + confetti behavior from §1.

---

## 5. Beautiful Zone pages (Zones tab rewrite + per-zone route)

Replace `ZonesTab` with a gallery of zone cards using the same `KIND_ACCENT` gradient + icon tile style:

- Cards: icon tile, zone name, progress ring, "n tasks · n done", "Open" → opens a Sheet (or new route `/home/zones/:slug`) showing the zone's checklist using `ChecklistTree`.
- Each zone has an editable checklist backed by `reset_checklists` (kind `custom`, `zone` stored in `category`) so items are full reset items — meaning they get scheduling (day, time block, est mins), recurrence (already in `reset_items.recurrence_type` + `recurrence_days`), due dates, and they auto-sync to `tasks` via the existing DB trigger.
- Edit affordances per item: schedule (day/time), recurrence (none/daily/weekly/monthly with day picker), due date, est minutes — all already supported by `ItemDetails` popover in `ChecklistTree`. Surface those controls more prominently on zone pages.
- AI generate-checklist button per zone (kept from current Zones tab) creates real `reset_checklists` so each zone produces schedulable + recurring tasks.

---

## Technical notes

- New migration: `reset_history(id, user_id, checklist_id, item_id, title, est_minutes, completed_at, duration_seconds)` with full GRANT block + RLS scoped to `auth.uid()`.
- New file `src/lib/confetti.ts` (canvas confetti, no dep).
- New `src/components/reset/ChecklistInline.tsx`, `src/components/reset/ResetHistorySheet.tsx`, `src/components/reset/ResetTimerBar.tsx`.
- Rewrite `src/components/home-hub/ZonesTab.tsx` to use `reset_checklists` per zone (drop the old `state.cleaning` path inside Home Hub; legacy `state.cleaning` widgets elsewhere untouched).
- Update `src/pages/HomeReset.tsx` (hero timer, smart next, confetti, history button, quick-reset toggle).
- Update `src/pages/HomeHub.tsx` (header restyle, embed Dashboard hero in Dashboard tab).
- Update `src/App.tsx` (`/dashboard` → `HomeHub`).
- Apply unified card/section styling across `RhythmTab`, `MaintenanceTab`, `AnalyticsTab`.
- No changes to existing reset_items ↔ tasks sync triggers — they already give us recurring/scheduled task behavior for free.
