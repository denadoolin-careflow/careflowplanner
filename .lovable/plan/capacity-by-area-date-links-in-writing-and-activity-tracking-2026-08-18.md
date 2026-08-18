# Capacity by area, date links in writing, and activity tracking

Three connected additions to the planner.

## 1. Capacity planning view (time by area)

A new full view on the planner that answers "where is my time going, and what should I change?"

- New tab in the planner view switcher: **Capacity** (alongside Schedule / Time of day / Week / Month).
- Range control: Day / Week / Month, reusing the planner's current period.
- Content:
  - Stacked horizontal bars per group with planned vs completed hours, plus percent of waking time.
  - Group-by pills: **Area**, **Activity** (resting, working, cleaning, commuting, cooking, caregiving, etc.), **Person** (care recipient), **Zone** (home zone), and the existing **Type**.
  - A target line per area: set a weekly hour target per area, stored locally; over/under target is shown as a colored delta chip.
  - "Adjust" row actions: jump to the filtered task list for that group, or bulk-reschedule its unscheduled items.
  - Trend sparkline comparing this period to the previous one.
- Powered by extending the existing allocation helper (`src/lib/planner/time-allocation.ts`) with the new group-by keys; no new aggregation engine.

## 2. Date references in notes and journal (`@today`, `@Aug 20`)

- The note editor already has an `@` mention picker. Add a **Dates** group to it:
  - `@today`, `@tomorrow`, `@yesterday`, next 7 weekdays, and free-typed dates (`@aug 20`, `@2026-08-20`) parsed as you type.
  - Selecting one inserts a date chip linked to `/planner/<yyyy-MM-dd>`, styled like existing reference chips.
- Typing a bare date without `@` stays plain text (no surprise linking), but the note's context rail keeps listing detected dates as it does today, now with a "Open in planner" action.
- Journal entries use the same editor, so they get this automatically; the journal dialog also gets a small "Link to planner day" affordance.
- Clicking a date chip navigates to that planner day. Planner day view gains a "Notes & journal referencing this day" list so the link works in both directions.

## 3. Activity types + people/zone tracking in the planner task editor

- Add an **Activity** field to the planner quick editor and the full task editor: Cleaning, Commuting, Cooking, Caregiving, Errands, Admin, Focus work, Rest, Other.
- Alongside it, the existing Area, Project, Person (care recipient) and Zone selectors get grouped into one compact "Tracking" row so the editor doesn't grow.
- Activity is stored the same way Zone already is — as a namespaced tag on the task (`act:cleaning`) — so no schema change and existing filters keep working.
- Activity chips appear on planner blocks and task rows (small icon + tint), and are filterable from the planner kind filter.
- Cleaning tasks pulled in from the cleaning module map to Activity = Cleaning with their zone preserved; caregiving items map to Caregiving with the recipient attached.

## Technical notes

- `src/lib/planner/time-allocation.ts`: extend `GroupBy` to `"kind" | "area" | "activity" | "person" | "zone"`, resolving activity/zone from task tags and person from `recipient_id`; add a previous-period comparison return.
- New `src/components/planner/PlannerCapacityView.tsx` plus a small `src/lib/planner/area-targets.ts` for locally persisted weekly targets.
- New `src/lib/task-tracking.ts` holding the tag namespaces (`act:`, `zone:`), option lists, icons, and helpers shared by the editors, chips, and allocation.
- Note editor: extend the `@` suggestion source in `src/components/notes/BlockEditor.tsx` with a date group built by a new `src/lib/notes/date-refs.ts` (parsing + `/planner/<iso>` href).
- Reverse lookup on the planner day reads notes/journal bodies for `/planner/<iso>` links and `[[date]]` matches.
- No database migration required.