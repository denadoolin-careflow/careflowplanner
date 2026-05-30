
## Scope

Seven related improvements across Tasks, Calendar, Today, and global shortcuts. All UI / presentation work — no schema changes.

---

## 1. Sections inside subtasks

In the task editor (`src/components/tasks/TaskEditor*` / subtask list):
- Allow grouping subtasks under user-named **sections** (e.g. "Prep", "Cook", "Cleanup").
- Reuse the existing `parentTaskId` model; store the section label on the subtask itself in a new optional `sectionLabel` field on `Task` (client-side only — stored in `notes` JSON tail or a dedicated column if already present; verify during build).
- UI: a "＋ Add section" button above the subtask composer; sections render as collapsible headers with their subtasks beneath. Drag-to-reorder optional v2.

## 2. Weather chip → opens weather

On the mobile `MobileTodayCard` and any "55° Mostly Clear" chip:
- Make the weather row a button. On click, scroll to / open the existing weather widget (`LunarPhaseWidget` neighborhood / `useWeekForecast`). If no on-page weather card exists in current view, open a `Sheet` with the week forecast.

## 3. Calendar day detail — richer day sheet

When tapping a date in `CalendarPage` (or `Month`), open a `DayDetailSheet` that contains:

```text
┌─ Tue, Jun 3 ───────────────────────────┐
│ 🌔 Waxing Gibbous 99% · Day 8 Follicular│
│ 55° Mostly Clear                        │
├─ Top 3 for the day ─────────────────────┤
│ 1. [ placeholder — tap to write ]       │
│ 2. [ placeholder — tap to write ]       │
│ 3. [ placeholder — tap to write ]       │
├─ Morning ───────────────────  + add ────┤
│   • task / appt rows                    │
├─ Afternoon ─────────────────  + add ────┤
├─ Evening ───────────────────  + add ────┤
├─ Meals ─────────────────────  + add ────┤
│   breakfast / lunch / dinner slots      │
├─ Routines & Habits ─────────────────────┤
│   ▓▓▓▓▓░░░░  4 / 9 complete             │
└─────────────────────────────────────────┘
```

- **Per-section + button / inline composer** reusing `InlineTaskComposer` with `defaults={{ dueDate, dayPart }}`.
- **Day parts** derived from `time` (morning <12, afternoon 12–17, evening ≥17, untimed → "Anytime").
- **Meals section** pulls from `state.meals` filtered to that ISO date; "+ add" opens meal quick-add.
- **Moon + cycle line** uses `getMoonPhase(date)` and `useCycle` for that date.
- **Weather line** uses `useWeekForecast` lookup by date; hidden if out of forecast range.
- **Top 3 tasks**: three tap-to-edit slots persisted via a small `daily_top3` key in `view_prefs` (localStorage-backed already in `useViewPrefs`); flag/star the underlying task when promoted.
- **Routines & Habits progress**: count `habits` due that day vs `log[iso]`; same for active routines' steps. Render `Progress` bar + `N / M complete`.

## 4. ⌘K shortcut cleanup

Today two palettes mount (`CommandPalette` and `UniversalSearchBar`) — both bind `Cmd/Ctrl+K`, hence the "two options pop up".

- Keep **⌘K = Universal Search + Voice / Brain Dump** (merge a "🎙 Brain dump" item at top of `UniversalSearchBar` that opens `VoiceCaptureDialog`).
- Remove the `Cmd+K` listener from `CommandPalette` and rebind it to **⌘J = Jump to Area / Page** (NAV + projects + areas).
- Update tooltips and the in-palette "Tips" footer to reflect the new bindings.

## 5. Mobile + desktop text overflow audit

- `MobileTodayCard`, `DayDetailSheet`, calendar cells: apply `truncate` / `line-clamp-2` and responsive type scales.
- Ensure section headings stay on one line at 360 px; tighten paddings; verify the greeting "GOOD MORNING, {NAME}" wraps cleanly when name is long.

---

## Files

**New**
- `src/components/calendar/DayDetailSheet.tsx`
- `src/components/calendar/DaySectionList.tsx` (Morning/Afternoon/Evening/Meals blocks)
- `src/components/calendar/DayTop3.tsx`
- `src/components/calendar/DayRoutinesProgress.tsx`
- `src/components/tasks/SubtaskSections.tsx`

**Edited**
- `src/components/today/MobileTodayCard.tsx` (clickable weather chip)
- `src/components/command/CommandPalette.tsx` (rebind to ⌘J, drop ⌘K, scope to nav/areas/projects only)
- `src/components/search/UniversalSearchBar.tsx` (add Brain dump entry, keep ⌘K)
- `src/pages/CalendarPage.tsx` / `src/pages/Month.tsx` (wire day click → DayDetailSheet)
- `src/components/tasks/TaskEditor*.tsx` (sections in subtask list)
- `src/lib/types.ts` (optional `sectionLabel?: string` on Task; `dayPart?: 'morning'|'afternoon'|'evening'|'anytime'`)
- Tailwind/typography passes on the above

## Out of scope
- No DB migrations (top-3 + sections stored client-side via existing prefs / notes).
- No changes to billing, auth, or sync.
