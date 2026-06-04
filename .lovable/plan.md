## Goal

Replace the current Projects page (a status-tab + tasks-list shell) with a **visual Project Hub** modeled after the attached CareFlow Creative Projects mock — warm sage / cream / plum / blush / gold palette, big editorial cards, hero "Focus This Week" panel, sidebar shelves for Ideas Inbox / Recently Updated / Waiting On, and Cards / List / Gallery views. Projects become first-class containers for tasks, notes, resources, inspirations, and milestones — not a wrapper around a task table.

The All-tasks tab on the existing page is preserved (moved to `/projects/all-tasks` or kept as a secondary view) so nothing is lost.

## Visual language

Reference: attached mockup. Tokens applied across the page:

- **Sage** `hsl(140 25% 70%)` — primary calm accent, active projects, progress fills
- **Cream** `hsl(40 50% 96%)` — page background washes & card surfaces
- **Plum** `hsl(330 30% 35%)` — primary CTA (Continue Project), headline accents
- **Blush** `hsl(15 60% 88%)` — warm secondary tiles, ideas
- **Gold** `hsl(40 80% 65%)` — highlights, stars, "Focus This Week" sparkle

These are added as semantic tokens (`--studio-sage`, `--studio-cream`, etc.) in `index.css` and `tailwind.config.ts` alongside the existing tokens — no replacement of the global theme.

## Data model additions

Two new optional fields on `projects`:

- `stage TEXT` — one of `idea | planning | building | launching | maintaining` (nullable, defaults to `planning`)
- `health TEXT` — one of `active | waiting | blocked` (nullable, defaults to `active`)

Plus a tiny new table for the Ideas Inbox so ideas aren't full Projects yet:

- `project_ideas (id, user_id, title, note, source, created_at)` with full RLS + GRANTs.

`Project` interface in `src/lib/types.ts` gains `stage?` and `health?`. The store's project upsert logic includes the new columns. Existing projects without a value render as `planning` / `active`.

Tasks, notes, resources, milestones already link to projects via existing columns — no schema change there. "Inspirations" reuse `resources` with a `kind = 'inspiration'` filter (the resources table already supports a kind/category field — if not, the resource card stores them as a tagged group via existing tag field).

## Page architecture

`src/pages/Projects.tsx` becomes a thin shell. New components under `src/components/projects/hub/`:

```text
ProjectsHub.tsx          ← top-level layout (hero row + projects grid + bottom shelves)
HeroFocusCard.tsx        ← left "Focus This Week" panel with Continue Project CTA
HeroStatsGrid.tsx        ← right 4-tile grid: Active / In Progress / Ready to Launch / On Hold
QuickCaptureRow.tsx      ← chips: New Idea · New Task · New Note · Resource · Inspiration
ProjectCard.tsx          ← cover-art card with icon, stage, health, %, next action, remaining
ProjectsToolbar.tsx      ← Cards / List / Gallery switcher + filters
ProjectsListView.tsx     ← compact list rows (existing list view, restyled)
ProjectsGalleryView.tsx  ← Pinterest-style mosaic with large covers
IdeasInboxShelf.tsx      ← bottom-left: list of `project_ideas` + "Capture a new idea"
RecentlyUpdatedShelf.tsx ← bottom-middle: projects by updated_at desc, with stage dot
WaitingOnShelf.tsx       ← bottom-right: projects with `health = waiting` + per-row "owner"
```

### Hero row

Two columns on desktop, stacked on mobile:

- **Left (60%)** — `HeroFocusCard`. Picks the user's "focus" project (most-recently-active with an open top task). Shows: cover art (gradient + leaf SVG when no cover), project name, % complete with sage progress bar, "Next up" + the open top task, and a big plum "Continue Project →" button that links to `/projects/:id`.
- **Right (40%)** — `HeroStatsGrid` (2×2 tiles): Active Projects, In Progress, Ready to Launch, On Hold. Each tile uses a small soft icon, the count, and a one-line label.

### Quick Capture row

Five soft chips: New Idea (gold), New Task (sage), New Note (cream), Resource (plum-outline), Inspiration (blush). Each opens an inline mini-form (`Popover`) and writes to the appropriate table.

### Projects grid (Cards view, default)

Responsive grid: 1 / 2 / 3 / 4 columns. Each `ProjectCard`:

- Top: cover image OR a gradient SVG mood scene derived from project color
- Floating icon tile in lower-left of cover
- Health pill in top-right (`Active` / `Waiting` / `Blocked`) with color coding
- Title (large display font)
- Progress bar in sage with **percent** on the right
- "**N** tasks remaining" subtitle
- Footer: stage chip (`Planning` / `Building` / etc.) + collaborator avatars stack
- Hover: lift + plum ring

### Cards / List / Gallery

- **Cards** — described above.
- **List** — compact rows (icon · name · stage chip · health pill · % bar · next due). Re-uses styling vocabulary.
- **Gallery** — mosaic of cover art only, big visual feel, name overlay on hover. Good for browsing creative work.

### Bottom shelves

Three columns, each a soft card with header + "View all":

1. **Ideas Inbox** — recent `project_ideas` rows; inline "+ Capture a new idea" input.
2. **Recently Updated** — projects sorted by `updated_at` desc, last 5, colored dot per stage.
3. **Waiting On** — projects with `health = waiting`; right column shows free-text "owner/blocker" field (stored in `projects.notes` JSON? **No** — use the existing `notes` column as a single `waiting_on` text via a new optional `waiting_on TEXT` column in the migration).

(Adding `waiting_on TEXT` keeps semantics clean; same migration as `stage` / `health`.)

## Filters / Empty states

- Filter bar: stage chips (Idea / Planning / Building / Launching / Maintaining / All), health chips (Active / Waiting / Blocked / All), and area dropdown.
- Empty hub: warm full-bleed illustration card with "Plant your first project" plum CTA → opens the create dialog.

## Technical details

**New / changed files**

- `supabase/migrations/<ts>_projects_hub.sql` — `ALTER TABLE projects ADD COLUMN stage`, `health`, `waiting_on`; `CREATE TABLE project_ideas` with full GRANTs + RLS.
- `src/lib/types.ts` — extend `Project`, add `ProjectStage`, `ProjectHealth`, `ProjectIdea`.
- `src/lib/project-ideas.ts` *(new)* — small CRUD module (list/add/promote-to-project/remove).
- `src/lib/store.ts` (or wherever projects are persisted) — read/write the new fields.
- `src/pages/Projects.tsx` — rewritten as the hub shell + a small `/?tab=tasks` fallback link to the existing AllTasksViews (kept reachable so power users don't lose it).
- `src/components/projects/hub/*` — new components listed above.
- `index.css` + `tailwind.config.ts` — add `--studio-sage / cream / plum / blush / gold` semantic tokens and Tailwind utilities (`bg-studio-sage`, etc.).

**Preserved behavior**

- `/projects/:id` (ProjectDetail) is untouched in this round — already supports tasks/notes/resources/milestones. We only link to it from the new cards.
- `addProject`, project status, area grouping, ProjectsAISummary — all reused. Stage replaces the visual emphasis on status but `status` continues to drive archive/done logic.

**Out of scope for this round**

- Cover-art uploader (cards use gradient placeholders that respect project color when no `coverUrl`).
- Reordering inside Cards view via drag-and-drop.
- ProjectDetail page redesign (separate effort).
