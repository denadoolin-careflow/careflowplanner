# CareFlow → Caregiver Life OS Refactor

This is a large, multi-system evolution. To keep the app stable, I'll ship it in **5 sequenced phases** rather than one massive rewrite. Each phase is self-contained, releasable, and builds on the existing architecture (no rebuild from scratch).

Before I start, I need you to confirm the **phase order** and **scope limits** below.

---

## Phase 1 — Universal Quick Add + Natural Language Tasks
**Goal:** Make capture instant and powerful (TickTick / Things style).

- Rebuild `QuickAddFab` into a **command palette** (cmdk-based) with:
  - Keyboard-first entry (`⌘K` / long-press on mobile)
  - Type-ahead category switcher (task, event, meal, idea, journal, habit, cleaning, care note, grocery, focus session, bookmark, routine)
  - Customizable categories: user-defined icon, color, default area/project, template body, hotkey
  - Saved templates (e.g. "Doctor visit", "Weekly reset")
- **Natural-language parser** for the task field:
  - Dates ("tomorrow 3pm", "next Tue")
  - Recurrence ("every Sunday evening", "weekdays")
  - Tags (`#meals`), priority (`p1–p4`), area (`@home`), duration (`for 30m`), reminders (`!1h`)
  - Live chip preview of what was parsed
- Persist user customization in a new `quick_add_presets` table.

## Phase 2 — Task System Refactor (Things 3 hierarchy)
**Goal:** Real Areas → Projects → Tasks → Subtasks.

- New `projects` table (area, status, deadline, notes, color, sort_order).
- Extend `tasks`: `project_id`, `parent_task_id` (subtasks), `status` (inbox/today/upcoming/anytime/someday/waiting/done), `reminder_at`, `depends_on_task_id[]`.
- New left-rail navigation: **Inbox · Today · Upcoming · Anytime · Someday · Waiting · Logbook**, plus expandable Areas → Projects tree.
- Inline editing everywhere (title, date, priority, tags) using existing `EditableText` patterns.
- Multi-select + bulk actions (move, schedule, complete, delete, change project).
- Drag-and-drop reordering and cross-list moves (dnd-kit, already present).
- Project detail page with progress ring, milestones, linked notes/events.

## Phase 3 — Unified Calendar Hub
**Goal:** Calendar becomes the central planning surface.

- Refactor `CalendarPage` to ingest a single feed of: tasks (with due/scheduled time), time-blocks, appointments, meals, cleaning, habits, routines, focus sessions, Google events.
- Views: **Day · 3-Day · Week · Month · Agenda · Timeline**.
- Drag-to-schedule from any list (sidebar "unscheduled" tray).
- Drag-resize for duration; recurrence editor; color-coded by area / priority / category (user toggles legend).
- Inline focus-session launch from any scheduled task.

## Phase 4 — Notion/Capacities-style Knowledge Layer
**Goal:** Connected second brain.

- New `pages` table (rich text/blocks JSON, type, parent_id, icon, cover) + `page_links` table for backlinks.
- Block editor (TipTap) supporting headings, lists, todo, image, embed, callouts, nested pages, mentions of tasks/projects/notes (`@`).
- Per-collection views: **Card · Gallery · Kanban · Table · Timeline** (saved per page).
- Backlinks panel + graph-lite "linked from" list.
- Templates (Daily journal, Project brief, Recipe, Care log).
- Rebuild Journal / Ideas / Care Notes on top of the new pages engine (data-migrated, not destroyed).

## Phase 5 — AI Planning Companion + Focus Analytics + Dashboard polish
**Goal:** Active AI helper + measurable productivity.

- Expand `ai-planner` edge function with intents: *plan-my-day · break-down-project · turn-note-into-tasks · what-can-wait · generate-reset · organize-week · low-energy-alt*.
- AI panel can write back: schedule tasks, create subtasks, propose time blocks (with confirm step).
- Focus analytics (sessions/day, streaks, focus-by-area) on Dashboard + dedicated `/focus/stats` page.
- Dashboard widget pass: ensure all widgets are draggable/resizable/collapsible (already started); add new widgets — Today Timeline, Calendar Preview, Focus Session, AI Suggestions, Weekly Progress, Focus Analytics.
- Final visual polish pass: motion (framer-motion) on list reorders, sheet transitions, swipe actions on mobile rows, consistent lucide icon system, refined typography scale.

---

## Technical Notes (for reference)

- **No rewrite**: existing `store.tsx`, Supabase tables, and pages are kept; new tables added side-by-side; legacy types extended, not replaced.
- **Migrations** introduced: `projects`, `quick_add_presets`, `pages`, `page_links`, plus task column additions. Each phase ships its own migration.
- **NLP parsing**: lightweight in-browser parser (chrono-node for dates) — no extra AI cost on the capture path.
- **Block editor**: TipTap (already React/Tailwind friendly).
- **Drag-and-drop**: dnd-kit (in tree).
- **Realtime**: opt-in per table later, not in this scope.

---

## What I need from you to start

1. **Phase order** — ship in the order above (1 → 5), or re-prioritize?
2. **Scope per round** — one phase per turn (recommended, ~safe), or bundle 1+2 / 3+4 together (faster but riskier on a live app)?
3. **Migration safety** — OK to migrate existing Journal / Ideas / Care Notes records into the new `pages` table in Phase 4, or keep them as separate legacy tables and only use `pages` for new content?
4. **Quick Add categories** — should I seed a default set (task, event, meal, idea, journal, habit, cleaning, care, grocery, focus) and let you customize, or wait for you to define the list?

Once you answer, I'll start Phase 1 immediately.
