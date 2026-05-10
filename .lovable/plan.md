## Scope

Six related features across routines, widgets, weekly page, themes, and meal timers. I'll group them into a single coordinated implementation.

### 1. Routines (per-person, per-slot, AI-generated)
- New table `routines` (user_id, person_name, slot: morning|nap|evening, items jsonb [{id,text,done}], notes).
- New `RoutinesStrip` component shown on every page via `AppLayout` (collapsible bar above main content).
- Person selector (free-text "people" stored in routines rows themselves; pick existing or "+ Add person") and slot tabs (Morning / Nap / Evening).
- Checklist items inline-editable, drag-free, simple add/remove.
- "Generate ideas" button → calls existing `ai-meal-plan`-style edge function pattern; create new edge function `ai-routine-ideas` using Lovable AI Gateway (Gemini default) to suggest 5–8 routine items based on person + slot + planning style.

### 2. Editable widget text
- For modular widgets on Dashboard (and any SectionCard `title`/`subtitle` used as widget headers in the grid), wrap titles in an `EditableText` component. Persisted overrides keyed by widget id in a new `widget_text_overrides` table (user_id, widget_id, field, value).
- Apply to dashboard widgets (Today, Weather, WeeklyWeather, Moon, Affirmation, etc.) — single-click to edit, Enter/blur to save.

### 3. Weekly page: Kanban toggle + time-of-day grouping + habits bar
- In `Week.tsx`, add view toggle: "Cards" (current) ↔ "Kanban".
- In Kanban mode: 7 columns (one per weekday). Each column groups tasks into Morning / Afternoon / Evening sections based on `tasks.day_part` (already exists). Drag isn't required — keep it as visual grouping with ability to change `day_part` via small dropdown on each task.
- In both modes, add a thin **habit completion bar** at the top of each day card: % of habits done that day from `habit_logs`.

### 4. Expanded color palettes + top-right picker
- Extend `theme-preset.ts` with more presets: default, sage, dusk, mono, rose, ocean, sunset, forest, lavender.
- Add CSS variables for each preset under both `:root[data-theme="x"]` (light) and `.dark[data-theme="x"]` (dark) in `index.css` so contrast holds in both modes.
- Add `ThemePicker` popover in header (next to existing `ThemeToggle`) showing color swatches.

### 5. Meal recipe custom timers → Focus page
- In `RecipeDrawer`, add "Add timer" button per recipe → opens small dialog (label, minutes), saves a `pomodoro_templates` user-template (existing system) tagged with `mealId`/`mealName`.
- These appear in the existing Pomodoro picker / FloatingPomodoro and contribute to existing `pomodoro_sessions` stats automatically (no schema change needed beyond a `meal_name` column on `pomodoro_sessions` if we want stats grouping).
- Add `meal_name` text column to `pomodoro_sessions` so Pomodoro history/stats can show "from Recipe: X".

## Technical Notes

**Migrations (single migration):**
- `routines` table + RLS (own routines all).
- `widget_text_overrides` table + RLS.
- `pomodoro_sessions.meal_name` text column (nullable).

**Edge function:**
- `ai-routine-ideas` — `verify_jwt = false`, uses `LOVABLE_API_KEY`, model `google/gemini-2.5-flash`. Input: `{ person, slot, style }`. Output: `{ ideas: string[] }`.

**New files:**
- `src/components/routines/RoutinesStrip.tsx`, `src/lib/routines.ts`
- `src/components/common/EditableText.tsx`, `src/lib/widget-text.ts`
- `src/components/layout/ThemePicker.tsx`
- `src/components/widgets/HabitProgressBar.tsx`
- `supabase/functions/ai-routine-ideas/index.ts`

**Edited files:**
- `src/components/layout/AppLayout.tsx` (mount RoutinesStrip + ThemePicker in header)
- `src/lib/theme-preset.ts` (more presets)
- `src/index.css` (palette variables for light + dark per preset)
- `src/pages/Week.tsx` (kanban toggle, day_part grouping, habits bar)
- `src/pages/Dashboard.tsx` (wire EditableText for widget titles)
- `src/components/meals/RecipeDrawer.tsx` (Add timer button)
- `src/lib/pomodoro-templates.ts` / `pomodoro-history.ts` (meal_name passthrough)
- `src/components/tasks/PomodoroHistory.tsx` (show meal name)

## Order of Work
1. Migration (routines, widget_text_overrides, pomodoro_sessions.meal_name) — requires approval.
2. Routines: table helpers, edge function, RoutinesStrip in AppLayout.
3. Themes: palette expansion + header ThemePicker.
4. Weekly: kanban toggle, time-of-day grouping, habit bar.
5. Editable widget text on Dashboard.
6. Recipe custom timers + pomodoro stats wiring.

No new third-party deps required.