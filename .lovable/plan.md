# CareFlow → Connected Life-Planning System

This is a very large scope (notes editor rewrite, monthly/weekly dashboards, journal system, knowledge graph, AI features). To keep quality high and avoid a fragile mega-PR, I'll ship it in phases. Each phase is independently usable.

## Phase 1 — Month View foundation + Inbox Capture
- Fix month grid: text wrapping, no truncation, dynamic row heights, better spacing/typography.
- Inbox Capture bar at top of Month page:
  - Single input, type-detector chips (task / appointment / note / idea / goal / reminder).
  - Natural-language parsing for dates ("next Thursday at 2", "on the 15th") via `chrono-node`.
  - Inline scheduling preview, quick-add animation.
  - AI suggestion endpoint (Lovable AI / `gemini-3-flash-preview`) that proposes type, date, and area.

## Phase 2 — Monthly Planning Dashboard
New `/month/plan` view (and tab on Month page) with cards for:
- Word of the Month, Intention, Emotional Focus, Priorities (mood-board / quote / vision optional).
- Monthly Goals + progress, Monthly Habits, Focus Areas, Projects this month.
- Bills, Budget snapshot, Birthdays, Anniversaries, Holidays, Key Events.
- Reflection prompts + monthly review with "carry over unfinished tasks" action.
- New tables: `monthly_intentions`, `monthly_reviews` (others reuse existing tables).

## Phase 3 — Weekly Planning Dashboard
New `/week/plan` view with: Meal Plan, Grocery, Appointments, Holidays/Birthdays, Weekly Goals, Project tasks, Cleaning, Caregiving, Habits, Budget snapshot. Morning/Afternoon/Evening sections, drag-and-drop scheduling, "Plan My Week" AI button, weekly reset workflow, progress indicators.

## Phase 4 — Daily Journal System
- New `journal_entries` extensions (`template`, `mood`, `energy`, `prompts jsonb`, `linked_ids jsonb`).
- Templates: gratitude, brain dump, caregiver reflection, emotional check-in, daily reset, productivity, habit reflection.
- AI prompt generator. Mood + energy tracking. Calendar timeline + streaks + archive.

## Phase 5 — Visual Block Editor (Notion/Capacities-style)
Replace current notes editor with a block editor:
- Library: **TipTap** (proven, React-friendly, extensible) with custom nodes for callouts, toggles, references, embeds.
- Live markdown rendering (no preview toggle), formatting toolbar, slash `/` command menu with search + keyboard nav, block drag handles + reorder, hover highlights.
- `/` references: tasks, notes, projects, goals, people, journal, meals, habits, appointments.

## Phase 6 — Connected Knowledge / Backlinks
- Generalize existing `note_links` to support all entity types both directions.
- "Referenced In" panel on every entity. Filters by date/project/goal/category/person/tags.
- Views: gallery, table, timeline, kanban (using existing patterns + `@dnd-kit`).

## Phase 7 — Visual polish pass
Refined CareFlow tokens (sage / tan-gold / cream / plum), soft gradients, glass cards, hover/drag micro-animations, typography scale, mobile editor polish.

## Technical choices
- Editor: `@tiptap/react` + extensions (StarterKit, Placeholder, Link, Image, Table, TaskList, custom slash + reference nodes).
- NLP dates: `chrono-node`.
- DnD: `@dnd-kit/core` + `@dnd-kit/sortable`.
- AI: existing Lovable AI Gateway via a new `ai-plan` edge function (handles capture parsing, plan-my-week, journal prompts) — model `google/gemini-3-flash-preview`.
- New tables guarded by RLS following existing pattern (`auth.uid() = user_id`).

## Suggested first slice
I recommend starting with **Phase 1 (Month view fixes + Inbox Capture with NLP + AI parsing)** — it's the most immediately visible win and unblocks the rest. Confirm and I'll proceed, or tell me which phase to start with / reorder.

```text
Phase 1 → 2 → 3 (planning surface)
        ↘ 5 → 6 (knowledge surface)
              ↘ 4 (journal ties both together)
              ↘ 7 (polish)
```

No code changes yet — awaiting your go-ahead on phase order.
