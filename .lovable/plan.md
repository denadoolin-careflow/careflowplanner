# Tiimo-Inspired Routines Upgrade

Bring the most loved patterns from Tiimo (a visual planner for ADHD/autism) into the existing Routines feature. The focus is **visualizing time**, **reducing reading load**, and **easing transitions** — not rebuilding from scratch. Existing data (`routines` table, `RoutineItem`) stays compatible; new fields are stored in a `meta jsonb` column.

## What the user will see

1. **Icon-first routine items** — each step gets a big emoji/icon picker. The timeline becomes scannable without reading.
2. **Per-step durations** — every step has a duration in minutes (default 5). Total routine time shows in the header.
3. **Pie timer Focus Mode** — full-screen view of the current step with a depleting circular timer, large icon, sub-text, and **Next →** preview of the following step. Skip / Done / Pause.
4. **Now / Next banner** — at the top of `Routines.tsx` and `RoutinesStrip`, a compact card showing the current step and what's next, calculated from `time_of_day` + cumulative durations.
5. **AI "Break it down"** — on any routine, a button that takes a vague goal ("get ready for school") and returns a list of sub-steps with icons + durations, appended to the routine.
6. **Get-Ready nudges** — store `prepNoticeMin` per routine (0/2/5/10). Surfaced in the Now/Next banner as "Starts in 5 min · get ready" pre-rolls.
7. **Calmer visual language on routines surfaces** — bigger rounded cards, soft chips, icon-anchored rows (Tiimo-style), reduced text density. Scoped only to the Routines page/strip/focus mode; no global theme change.

Out of scope: community template library, lockscreen widgets, OpenDyslexic font, cross-app push notifications.

## Technical plan

### Data
- Migration: `ALTER TABLE public.routines ADD COLUMN meta jsonb NOT NULL DEFAULT '{}'::jsonb;`
- Extend `RoutineItem` in `src/lib/routines.ts`:
  ```ts
  interface RoutineItem {
    id: string; text: string; done: boolean;
    icon?: string;        // emoji or lucide name
    durationMin?: number; // default 5
    note?: string;
  }
  ```
- Extend `Routine` with derived getters from `meta`: `prepNoticeMin?: number`, `color?: string`.
- Update `mapRow` / `upsert` to round-trip `meta` and per-item fields (already JSON, so just type-safe accessors).

### Components (new, under `src/components/routines/`)
- `IconPickerPopover.tsx` — small emoji + curated lucide set; reuses existing `LucideIconPicker` patterns.
- `RoutineItemRow.tsx` — replaces the inline item row in `RoutineCard` and `RoutinesStrip`: icon button, text, duration chip (click to edit), checkbox, focus button.
- `NowNextBanner.tsx` — pure presentation, takes a `Routine[]` for one person, computes current/next step from clock + durations.
- `RoutineFocusMode.tsx` — `Dialog`-based full-screen. Pie timer (SVG circle `stroke-dasharray` animation, no extra dep), big icon, step text, Next preview, controls (Pause/Skip/Done). Drives off local `setInterval`; calls `routinesApi.toggleItem` on Done.
- `AIBreakdownDialog.tsx` — input + result list with icons/durations, "Add all" / "Add selected".

### Wiring
- `src/pages/Routines.tsx` — mount `NowNextBanner` above filters; swap item rendering inside `RoutineCard` to `RoutineItemRow`; add **Focus** button per routine (opens `RoutineFocusMode`); add **Break it down** button next to the existing AI button.
- `src/components/routines/RoutinesStrip.tsx` — same `RoutineItemRow`, compact mode; add small Focus icon.
- `src/lib/routines.ts` — add `updateItem(person, slot, itemId, patch)` for partial item updates (icon/duration/note) on top of existing helpers. Add `routineTotalMinutes(r)` and `computeNowNext(routines, now)` pure helpers.

### AI
- New edge function `supabase/functions/ai-routine-breakdown/index.ts` using Lovable AI Gateway (`google/gemini-2.5-flash`, tool-call output) returning `{ steps: [{ text, icon, durationMin }] }`. Mirrors `ai-routine-ideas` structure.

### Styling
- Add a `routine-card` variant using existing tokens — larger radius (`rounded-3xl`), `bg-card/70`, subtle shadow. No new colors; reuse semantic tokens from `index.css`.

## File map

Create:
- `supabase/migrations/<ts>_routines_meta_and_items.sql`
- `supabase/functions/ai-routine-breakdown/index.ts`
- `src/components/routines/IconPickerPopover.tsx`
- `src/components/routines/RoutineItemRow.tsx`
- `src/components/routines/NowNextBanner.tsx`
- `src/components/routines/RoutineFocusMode.tsx`
- `src/components/routines/AIBreakdownDialog.tsx`

Edit:
- `src/lib/routines.ts` (types, helpers, meta round-trip)
- `src/pages/Routines.tsx` (banner, focus button, AI breakdown, new row)
- `src/components/routines/RoutinesStrip.tsx` (new row, focus shortcut)
