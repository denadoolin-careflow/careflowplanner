# Build plan — three phases

Research-backed (BJ Fogg B=MAP, Atomic Habits, SDT, Finch/Way of Life patterns). Per your choices: notes/journal first → habit garden → analytics graph w/ insights engine.

---

## Phase 1 — Notes & Journal: TOC sidebar + word count + goals

**Sidebar Table of Contents**
- New `src/components/notes/NoteTOC.tsx` — parses BlockEditor headings (H1/H2/H3), renders a sticky right-rail list with click-to-scroll + active-section highlight via IntersectionObserver.
- Wire into `NoteDetail.tsx` and `JournalFlow.tsx`. Collapsible on mobile (sheet), pinned on ≥lg.

**Word count + goals**
- New `src/lib/writing-goals.ts` — localStorage-backed daily goal (default 250 words), per-note targets stored on note row (`word_goal` column).
- Footer chip in `BlockEditor.tsx`: live word count, reading time, target progress ring.
- New `src/components/notes/DailyWritingGoal.tsx` widget — progress ring + streak (today's total across journal entries). Dashboard widget + top of `Journal.tsx`.
- Migration: add `word_goal int` to `notes` table (nullable).

---

## Phase 2 — Garden habit & routine system

**Garden visualization**
- New `src/components/habits/HabitGarden.tsx` — each habit = a plant that grows through 5 stages (seed → sprout → bud → bloom → tree) based on a forgiving 14-day rolling completion ratio (not raw streak). Sage/clay palette per your pick.
- SVG plants in `src/assets/plants/` (generate via imagegen, transparent PNGs).
- Tap plant → quick log; long-press → details.

**Behavior-change patterns baked in**
- **Tiny-habit framing**: habit creation flow asks "After I ___, I will ___" (habit stacking) + tiny version field.
- **Forgiving streaks**: replace raw streak with "consistency %" + grace days (2/week free, "rest day" log option). Never resets to 0.
- **Identity badges**: auto-assigned titles (e.g., "Mindful mover · 21 reps") shown on garden plot.
- **Focus Mode for routines**: `RoutineFocusMode.tsx` — full-screen sequential runner, per-step timer, cumulative time, swipe-next, haptics on each completion (reuses existing haptics + completion-visual systems).
- **Drag-to-reorder** routine items (dnd-kit, already in deps).
- **Self-compassion prompt** on miss: "Was today a rest day?" toggle instead of "missed".
- **Emergency / low-energy mode**: existing `lowEnergyMode` filters garden to top 3 "essential" habits (new `essential` flag).

**Files**
- New: `HabitGarden.tsx`, `PlantSprite.tsx`, `RoutineFocusMode.tsx`, `HabitCreateDialog.tsx`, `src/lib/habit-consistency.ts`.
- Edit: `Habits.tsx`, `Routines.tsx`, `RoutinesStrip.tsx`, store schema (`essential`, `grace_days`, `tiny_version`, `stack_anchor` fields on habit; migration).

---

## Phase 3 — Dashboard graph + focus/cycle insights engine

**Dashboard graph view**
- New `src/components/dashboard/DashboardGraph.tsx` — toggle on Dashboard between current grid and a "graph view" (recharts radial + sparkline grid of: tasks done, focus minutes, habits %, mood, sleep, cycle phase).

**End-of-day time analytics**
- New `src/pages/Insights.tsx` (route `/insights`) with three views:
  1. **Today** — donut of where time went (tasks by area + pomodoro sessions by tag) + current moon/cycle badge.
  2. **28-day trends** — stacked area: focus minutes per day, overlaid with lunar phase ribbon and menstrual cycle phase band (uses existing `lib/moon-phase.ts`, `lib/cycle.ts`).
  3. **Insights** — AI-generated correlations via new edge function `ai-rhythm-insights` (Lovable AI Gateway, `google/gemini-3-flash-preview`). Pulls last 28 days of pomodoros, completed tasks, mood check-ins, cycle phase, moon phase; returns ranked observations (e.g., "Focus peaks in follicular + waxing moon: +34%") + 3 gentle recommendations.

**Data plumbing**
- Reuse existing `pomodoro-history`, `tasks`, `cycle-store`, `moon-phase`. No new tables required for Phase 3 reads.
- New edge function: `supabase/functions/ai-rhythm-insights/index.ts`.

**Wiring**
- Add "Insights" to bottom nav / sidebar.
- Dashboard graph view added as togglable mode on Dashboard.
- End-of-day card on Today links to Insights/Today view.

---

## Technical notes

- All UI uses semantic tokens from `index.css`; sage palette aligns with existing warm theme.
- Recharts already in deps (used in `MaintenanceTab` analytics).
- IntersectionObserver for TOC scroll-spy is React-friendly via custom hook.
- Edge function follows Lovable AI Gateway pattern (no user API key).
- Migrations: 1 for `notes.word_goal`, 1 for habit fields (`essential`, `grace_days`, `tiny_version`, `stack_anchor`).

---

## Ship order

1. Phase 1 (notes TOC + word goals) — this turn after approval.
2. Phase 2 (garden habits) — next turn.
3. Phase 3 (graph + insights) — turn after that.

Approve to start Phase 1.