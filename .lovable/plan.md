## Goal

Let any note attach to any number of tasks, appointments, time blocks, projects, goals, or habits — and let each of those entities show its linked notes inline. One note can be linked to many things; each thing can have many notes.

## Approach

Add a single `note_links` join table that points a note at any entity type via `(entity_type, entity_id)`. This avoids adding columns to six different tables and lets us add more types later.

```text
notes ─┬─ note_links ─┬─ tasks
       │              ├─ projects
       │              ├─ goals
       │              ├─ habits
       │              ├─ appointments
       │              └─ time_blocks
```

## Database (one migration)

New table `public.note_links`:
- `note_id` (uuid, FK → notes, cascade delete)
- `entity_type` (text, one of: `task`, `project`, `goal`, `habit`, `appointment`, `time_block`)
- `entity_id` (uuid)
- `user_id` (uuid, for RLS)
- timestamps
- unique `(note_id, entity_type, entity_id)`
- indexes on `(entity_type, entity_id)` and `(note_id)`
- RLS: users can only see/modify their own rows (`auth.uid() = user_id`)

## Backend helpers (`src/lib/note-links.ts`)

- `EntityType` union + label/icon map
- `linkNote(noteId, entityType, entityId)` / `unlinkNote(...)`
- `listLinksForEntity(entityType, entityId)` → notes attached to a task/project/etc.
- `listLinksForNote(noteId)` → entities a note is attached to (resolved against the local store + a notes lookup so we can render names)
- `useEntityNotes(entityType, entityId)` hook — fetches linked notes for a panel

## UI

### 1. Reusable `LinkedNotesPanel` component
Drop-in panel showing notes attached to one entity, with:
- list of linked notes (title + snippet + open button → `/notes/:id`)
- "+ Link a note" combobox (search existing notes by title)
- "+ New note" button (creates a note, auto-links it, opens the editor)
- unlink (×) per row

Used inside:
- `TaskEditor` → new "Notes" section under the existing fields
- `ProjectDetail` → new section in the side rail
- `Goals` → expandable per-goal panel
- `Habits` → expandable per-habit panel
- `AppointmentEditor` → notes section
- `TimeGrid`'s time-block edit dialog → notes section

### 2. Reverse view in `NoteDetail`
Add a "Linked to" sidebar listing every entity this note is attached to, grouped by type (Tasks, Projects, Goals, Habits, Schedule). Click → navigate to that entity. Includes an "Attach to…" button that opens a picker with tabs per type.

### 3. Universal search bar
Extend `UniversalSearchBar`: when a note result is shown, surface its link count as a small badge. When a task/project/etc. is shown and has notes, show a 📝 badge.

### 4. Existing single `note.projectId` field
Keep it for now (used in note creation flow), but also write a `note_link` row whenever a note is created with a `projectId` so everything flows through the unified system. A small one-time migration backfills existing `notes.project_id` values into `note_links`.

## Out of scope (not in this plan)
- Mentions/`[[wiki-links]]` already exist in `notes.ts`; we keep them as-is and don't auto-create `note_links` from them.
- Realtime sync of link changes.
- Bulk link management UI.

## Files

**New**
- `supabase/migrations/<ts>_note_links.sql`
- `src/lib/note-links.ts`
- `src/components/notes/LinkedNotesPanel.tsx`
- `src/components/notes/NoteLinksSidebar.tsx`
- `src/components/notes/NotePicker.tsx` (search + attach existing note)

**Edited**
- `src/components/tasks/TaskEditor.tsx` — embed `LinkedNotesPanel`
- `src/components/calendar/AppointmentEditor.tsx` — embed `LinkedNotesPanel`
- `src/components/calendar/TimeGrid.tsx` — embed `LinkedNotesPanel` in EditForm
- `src/pages/ProjectDetail.tsx` — embed `LinkedNotesPanel`
- `src/pages/Goals.tsx` — per-goal expandable notes
- `src/pages/Habits.tsx` — per-habit expandable notes
- `src/pages/NoteDetail.tsx` — add `NoteLinksSidebar`
- `src/components/search/UniversalSearchBar.tsx` — small link badges

## Open question

Currently a note has a single `projectId`. Should I keep that field and additionally mirror it into `note_links`, or fully drop it in favor of the join table? My plan keeps both for backward compatibility, but I can remove it if you prefer the cleaner model.
