## Notes Redesign — Second Brain v1

A focused build of the Notes experience that keeps CareFlow's warm aesthetic (soft peach, rounded cards, serif headings, gentle shadows) and adds the structure of Notion/Capacities/Craft. AI suggestions and an embedded graph are deferred; Connections links out to the existing `/graph` page.

### 1. Page shell — `src/pages/Notes.tsx`

Three-column split-view layout on desktop, single column on mobile:

```text
┌──────────────────────────────────────────────────────────────┐
│  Header: title · search · filter · sort · view · + New      │
├──────────┬───────────────────────────────────┬───────────────┤
│ Left nav │  Main view (Grid/Board/…)         │ Context rail  │
│ Tags     │  Stat cards row                   │ (when a note  │
│ Smart    │  Pinned strip                     │  is selected) │
│ collect. │  Active view body                 │               │
└──────────┴───────────────────────────────────┴───────────────┘
```

- Left nav and right rail collapse to icons / hide on `md` and below.
- Selecting a note from any list view sets a `?note=<id>` query param and opens the right rail with that note's context; the full editor still lives at `/notes/:id` and the rail has an "Open full page" link.
- `NotesHub` hero card is removed (replaced by the new header + stat row).

### 2. Header

- Title "Notes" (serif), subtitle "Your second brain".
- Global search input with instant client-side filter across title, body, and tags. Cmd/Ctrl+K focuses it.
- **Filter** popover — tag chips (multi-select), kind (note/daily), pinned only, has-cover, has-links.
- **Sort** menu — Updated / Created / Title / Word count.
- **View switcher** — All notes · Grid · Board · Timeline · Calendar · Connections. "Connections" navigates to `/graph?focus=notes`. "All notes" is a compact list (current list view, renamed).
- **+ New note** primary button with a small caret menu: New note / New daily note / New from template.

### 3. Left navigation panel

New component `src/components/notes/NotesSideNav.tsx`.

**Smart Collections** (auto-derived from the loaded notes):
- Recently Edited, Pinned, Daily Notes, Linked Notes (any `[[…]]`), Untagged, Archived.
- Each row: icon, label, count, active state. Clicking sets the active collection (drives filtering of the main view).

**Tags**
- Pulls from `tags` table (already exists with color + icon + pinned).
- Counts come from notes' `tags` array (computed client-side from the loaded list).
- Tag row: colored dot/icon, name, count. Click filters; right-click / "…" opens an inline menu: Open tag page, Rename, Recolor, Merge, Delete.
- "+ New tag" row at the bottom opens the existing `TagManagerDialog`.

**Section preferences persist** in `localStorage` (collapsed/expanded, active collection).

### 4. Stat cards row

Replaces the four flat cards with a richer six-up grid (collapses to 2×3 on mobile):
- Total Notes (with delta vs last week).
- Notes This Week.
- Writing Streak (consecutive days with at least one updated/created note).
- Daily Average (last 30 days).
- Most Used Tag (colored pill).
- Recently Created (count this week + link to filter).

Each card uses the existing warm gradient tokens; one accent color per card pulled from the design system.

### 5. Pinned strip

Horizontally scrollable rail of pinned notes (already present in the screenshot) — restyled to match the new card design and limited to 8.

### 6. Redesigned note card — `src/components/notes/NoteCardV2.tsx`

```text
┌────────────────────────────┐
│  ░░░ cover gradient ░░░░░  │
│  🌙  Title                 │
│     Preview text…          │
│  [Journal] [Moon] · 3 link │
│  Jun 8 · 124 words         │
└────────────────────────────┘
```

- Top: cover gradient or solid tinted band, emoji/icon overlay, pin badge.
- Middle: serif title, 2-line preview (markdown-stripped).
- Bottom: tag chips (colored from the `tags` table), updated date, linked-items count (count of `[[…]]` refs in body).
- Hover lift + soft ring, focus ring for keyboard.

### 7. Views

- **All notes (list)** — keep current list, restyled with the new card density and tag chips.
- **Grid** — `NoteCardV2` in a responsive grid (1/2/3/4 columns).
- **Board** — existing kanban, group selector adds **Tag** as a new option in addition to Kind/Project/Month. Tag columns auto-render one column per tag in use (plus "Untagged").
- **Timeline** — vertical timeline grouped by day with a left date rail; reuses `NoteCardV2` in a compact horizontal layout.
- **Calendar** — keep the current month grid; each day shows up to 3 chips (daily note gets a sun glyph, others get tag dots). Clicking a day opens a day-detail popover listing all notes for that day with a "+ New daily note" CTA.
- **Connections** — `NavLink` to `/graph?focus=notes` (no new graph component built here).

### 8. Right context rail — `src/components/notes/NoteContextRail.tsx`

Appears when `?note=<id>` is set. Sections (collapsible):
- **Properties** — Title, kind, project, created, updated, word count, reading time.
- **Tags** — chips + inline tag picker (reuses `TagPicker`).
- **Linked content** — outgoing `[[…]]` links and incoming backlinks (reuses `findBacklinksTo`), plus the note's linked project/tasks if `projectId` is set.
- **Open full page** button → `/notes/:id`.

The full-page `NoteDetail` route is untouched; the rail is index-side only.

### 9. Daily Notes system

New component `src/components/notes/DailyNoteTemplate.tsx` rendered when the daily note's body is empty. Auto-inserts a structured markdown skeleton on first open:

```text
# {date}
**Mood:** 
**Weather:** {auto from weather store if available}
**Moon phase:** {auto from cosmic store if available}

## Journal


## Wins
- 

## Gratitude
- 

## Tasks
- [ ] 
```

- Implemented as a one-time scaffold (only fills if body is empty) so existing daily notes are untouched.
- Left nav exposes a "Daily Notes" smart collection and the header's New menu gets "New daily note".
- A small "Recent dailies" rail can be toggled on/off in the main view.

### 10. Tag pages — `src/pages/TagDetail.tsx` at `/tags/:name`

(Route already exists in the sidebar — repurpose or create.)
- Header: tag icon + name (large), description (editable, stored in `tags.description`), color, "Pin to sidebar" toggle.
- Three stat tiles: # notes, # projects (notes' `projectId` distinct), # related tags (tags that co-occur in the same notes).
- Tabs: Notes (grid), Related tags (chips), Projects (cards linking to project detail).
- Inline rename, recolor, merge, delete.

### 11. Schema changes (one migration)

- `tags.description text` (nullable).
- Index `notes_tags_gin` — `CREATE INDEX IF NOT EXISTS notes_tags_gin ON public.notes USING gin (tags);` for fast tag filtering as the library grows.

No new tables. RLS / grants unchanged. Existing notes and tags continue to work.

### 12. Out of scope (explicitly deferred)

- Embedded graph view inside Notes (link-out instead).
- AI smart suggestions / smart search (the existing global search + filter covers v1).
- Drag-and-drop between Board columns to reassign tag/project (still click-to-edit).
- Real-time multi-user note presence.

### Technical notes

- All new files live under `src/components/notes/` or `src/pages/`.
- Reuse `tags`, `getNoteCoverCss`, `resolveNoteIcon`, `NoteMarkdown`, `TagPicker`, `findBacklinksTo`.
- View / collection / sort / filter state lives in URL search params (`?view=`, `?collection=`, `?tag=`, `?note=`, `?q=`) so views are shareable and back-button-friendly.
- Stats and tag counts are derived client-side from the in-memory note list (already capped at 500 by `listNotes`).
- Mobile: left nav becomes a top-row chip scroller; right rail becomes a bottom sheet that slides up when a note is tapped.
