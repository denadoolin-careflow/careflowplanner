
## 1. Ritual cards on Routines page
- Add a "Rituals" strip at the top of `src/pages/Routines.tsx` reusing the garden-stage tiles from `HabitGarden`'s rituals section (extract into `src/components/routines/RitualStrip.tsx`).
- Each tile: person · slot · stage emoji · today's completion ratio · "Tend" → opens `RoutineFocusMode`.
- While focus is active (pomodoro has `routineId`), pin a compact "Now tending" side card with step list + progress.

## 2. Focus card + Pomodoro clock time and step list
- In `RoutineFocusMode`: show wall-clock time of current step (from `item.startTime` or computed schedule) under the title, plus an estimated finish time.
- Below the pie, render an ordered step list with done/active/upcoming states and a thin progress bar; clicking a step jumps to it.
- In `FocusPanel` `RoutineStepWidget`: add current clock time + scheduled time chip and a collapsed step list (current ±2) with the same visualization.

## 3. Family member color coding
- Extend routine person model: `routines.ts` gains `personColor` + `personIcon` per person (stored in a new `routine_people(user_id, name, color, icon)` table, joined into the cached routines payload).
- `PersonQuickAdd` popover gains color swatch + icon picker (reuse `LucideIconPicker`).
- `RoutineCard` person chip + ritual tiles + focus header tint from `personColor`.
- For tasks: add an optional `person_tag` (name) on tasks. Render chip with same color/icon via a shared `PersonTagChip` component. TaskEditor + TaskRow get a person picker driven by the same `routine_people` list (so the family list is one source of truth across routines, tasks, caregiving).

## 4. Searchable icon library for routines + habits
- Build `src/components/common/SearchableIconPicker.tsx`: searchable grid over a curated ~300-icon set from `lucide-react` (+ emoji set for routines).
- Replace `IconPickerPopover` (routines step icons) and habit icon picker usages with this component. Recent picks persist in localStorage.

## 5. Personalized developmental plan from profile data
- Expand `ai-person-overview` prompt to weight profile inputs more explicitly: age band, diagnosis/sensory notes, cycle phase, zodiac, love languages, school level, meds, schedule.
- Restructure response to include a dedicated `developmentalPlan: { milestones[], strengths[], supports[], redFlags[], nextSteps[] }` block.
- `PersonDashboard.tsx` renders a new "Developmental Plan" section at the top with milestone chips and a 4-week focus list. Add "Regenerate from profile" button that re-hashes inputs to force refresh.

## 6. Caregiving chores linked to Home
- New `caregiving_chores(user_id, recipient_id, title, zone_id?, area, cadence, assigned_to, last_done_at)` table.
- `CareTasksPanel` (or new `CareChoresPanel`) tab inside Caregiving recipient view: list chores, mark done, assign to family member (uses color tags from #3).
- When a chore has a `zone_id`, it also shows up in `HomeHub` ZonesTab as a care-flagged task; completing in either place syncs both via shared row.
- Add a "Send to Home" action that creates a matching Reset/Home task (reusing the existing reset_items↔tasks sync pattern).

## Technical notes
- New tables: `routine_people`, `caregiving_chores`. Both RLS-scoped to `auth.uid()`, with GRANTs to `authenticated` + `service_role`.
- Tasks table: add nullable `person_tag text` column; no backfill needed.
- No changes to `client.ts`/`types.ts` (auto-regenerated after migration).
- AI weight for the expanded person overview stays at 5.

## Suggested order
1, 2 first (pure UI, immediate value). Then 3 + 4 (shared infra). Then 5 (AI). Then 6 (new chores surface).

Want me to drop or reorder anything before I build?
