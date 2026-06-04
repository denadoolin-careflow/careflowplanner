# Project Detail → Project Hub Redesign

Transform `src/pages/ProjectDetail.tsx` (currently a 920-line task-DB style page) into a calm, inspiring single-project workspace matching the new Projects Hub aesthetic and the attached mockup.

## Scope

- Rebuild the Overview surface (hero + 3-column dashboard + Ideas Inbox).
- Restyle tabs and wrap existing task/notes/resources components in the new visual shell.
- Add lightweight UI-only concepts: Atmosphere, Project Energy, Next Best Step AI card.
- Reuse existing data: `projects`, `tasks`, `project_sections`, `project_ideas`, notes, resources, milestones.

Out of scope: changing task data model, kanban internals, file upload backend, real journal/atmosphere persistence beyond a single new column.

## New Components (`src/components/projects/detail/`)

- `ProjectHubHeader.tsx` — back link, project icon, title, description, avatars, Share, Edit Project, quick search.
- `ProjectHero.tsx` — cover (reuses `ProjectCoverArt`), status + stage chips, % progress bar, stat tiles (Team / Tasks remaining / Target date), inline Focus-this-week card with Update Focus.
- `NextUpCard.tsx` — top priority task with due, assignee, energy, est. minutes.
- `MilestonesTimelineCard.tsx` — wraps existing `MilestonesCard` content in the new soft card style.
- `ProgressRingCard.tsx` — donut for Completed / In Progress / Not Started / Blocked.
- `ThisWeekCard.tsx` — current-week tasks with checkboxes.
- `NotesPreviewCard.tsx` — last 3 notes (uses `useEntityNotes`).
- `ProjectLinksCard.tsx` — links from existing resources (filter `type=link`), grouped by inferred provider (Figma/Notion/Miro/Docs/Lovable).
- `IdeasInboxStrip.tsx` — uses `useProjectIdeas` filtered to this project (add `project_id` filter); cards + Capture Idea.
- `AtmospherePicker.tsx` — chip picker (Sage Sanctuary, Moonlit Focus, Blossom, Quiet Morning, Momentum); updates CSS vars on hero.
- `NextBestStepCard.tsx` — calls existing `aiInvoke` with project context; returns one suggestion.
- `ProjectEnergyCard.tsx` — derived (avg task energy) + recommended action label.

## Layout

```text
[ Back · Title · Icon · Search · Avatars · Share · Edit ]
[ ───────── Hero (cover + status/stage/% + stats + Focus) ───────── ]
[ Tabs: Overview | Tasks | Milestones | Notes | Resources | Files | Activity ]

Overview:
  ┌ Col 1 ───────────┐ ┌ Col 2 ───────────┐ ┌ Col 3 ───────────┐
  │ Next Up          │ │ Progress Ring    │ │ Notes preview    │
  │ Milestones       │ │ This Week        │ │ Project Links    │
  └──────────────────┘ └──────────────────┘ └──────────────────┘
  [ Ideas Inbox strip ]
  [ Atmosphere · Energy · Next Best Step row ]
```

## Tabs

- **Overview**: new dashboard above.
- **Tasks**: keep existing list/kanban/schedule logic from current `ProjectDetail` extracted into `ProjectTasksTab.tsx`; add a 4th view stub "Timeline" (reuses `ProjectProgressTimeline`).
- **Milestones**: full `MilestonesCard` view.
- **Notes**: existing `LinkedNotesPanel` + `ProjectJournalPanel`.
- **Resources**: existing `ResourcesCard`.
- **Files**: filter resources where `type=file`, render as gallery grid (existing data, new presentation).
- **Activity**: simple chronological merge of task completions, notes added, milestone toggles (client-side from store, no new tables).

## Data Changes

One small migration:

- `ALTER TABLE public.projects ADD COLUMN atmosphere TEXT, ADD COLUMN focus_this_week TEXT, ADD COLUMN target_date DATE;`
- `ALTER TABLE public.project_ideas ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;` (nullable — inbox stays global; project-scoped when set).

No new tables, no new RLS — covered by existing policies. Update `types.ts`, `store.tsx` mapping, and `project-ideas.ts` to accept optional `projectId`.

## Files

**Created**
- `src/components/projects/detail/ProjectHubHeader.tsx`
- `src/components/projects/detail/ProjectHero.tsx`
- `src/components/projects/detail/NextUpCard.tsx`
- `src/components/projects/detail/MilestonesTimelineCard.tsx`
- `src/components/projects/detail/ProgressRingCard.tsx`
- `src/components/projects/detail/ThisWeekCard.tsx`
- `src/components/projects/detail/NotesPreviewCard.tsx`
- `src/components/projects/detail/ProjectLinksCard.tsx`
- `src/components/projects/detail/IdeasInboxStrip.tsx`
- `src/components/projects/detail/AtmospherePicker.tsx`
- `src/components/projects/detail/NextBestStepCard.tsx`
- `src/components/projects/detail/ProjectEnergyCard.tsx`
- `src/components/projects/detail/ProjectTasksTab.tsx` (extracted)
- `src/components/projects/detail/ProjectActivityTab.tsx`
- `src/components/projects/detail/ProjectFilesTab.tsx`
- `supabase/migrations/<ts>_project_detail_hub.sql`

**Rewritten**
- `src/pages/ProjectDetail.tsx` — slim shell composing header + hero + tabs.

**Edited**
- `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/project-ideas.ts`.

## Visual System

Reuses `studio-tokens.ts` (sage/cream/plum/blush/gold). Rounded `2xl` cards, soft shadows (`shadow-sm` + tinted blur), botanical hero gradients from `ProjectCoverArt`. Atmosphere selection swaps the hero gradient and accent CSS vars locally — no global theme change.

## Preserved

- `addProject`, `ProjectsAISummary`, all task/section CRUD, kanban/schedule logic, journal panel, resources, milestones data.
- `/projects` hub (already redesigned).
