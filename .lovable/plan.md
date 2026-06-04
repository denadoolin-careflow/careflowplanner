# Tag Detail — Notes views with inline context

Redesign the **Notes** section on `/tags/:name` (`src/pages/TagDetail.tsx`) so a tag page becomes a real lens into how that tag shows up across your notes — not just a list of titles.

## What changes for the user

When you open a tag, the Notes block gets a view switcher with four modes:

1. **List** (default — current behavior, refined)
2. **Gallery** — visual cards with a larger snippet excerpt
3. **Kanban** — columns grouped by note `kind` (Daily, Quick, Standard, Meeting, etc.) or by status
4. **Date** — timeline grouped by month/week, newest first

In every view, each note shows an **inline context snippet**: the sentence(s) around where `#tagname` appears in the body, with the hashtag highlighted in the tag's accent color. If the tag is only in metadata (not body), we show a subtle "tagged" pill plus the first line of the note instead of the title alone.

Tasks, Grocery, and Projects sections stay as-is.

## Layout

```text
┌─ Notes · 12 ────────────────[ List | Gallery | Kanban | Date ]─┐
│                                                                 │
│  Gallery example:                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Tue, Jun 3   │  │ Garden ideas │  │ Meeting w/ M │          │
│  │ …watered the │  │ …plant more  │  │ …discussed   │          │
│  │ #sage and …  │  │ #sage near…  │  │ the #sage …  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Technical details

**New file:** `src/components/tags/TagNotesPanel.tsx`
- Props: `{ notes: Note[]; tagName: string; accent: string; onAdd: () => void }`
- Internal `view` state: `"list" | "gallery" | "kanban" | "date"`, persisted to `localStorage` key `tag-notes-view`
- View switcher: shadcn `Tabs` styled as a compact segmented control in the section header
- Helper `extractTagContext(body, tagName)`:
  - Strip markdown, find first case-insensitive match of `#tagName`
  - Return ~140 chars of surrounding text with the match index, so the renderer can wrap the hashtag in a `<mark style={{ color: accent, background: 'transparent' }}>` span
  - Fallback to first non-empty line if no body match
- Title resolver reuses existing logic (`kind === "daily"` → formatted date, else `title || "Untitled"`)

**Views:**
- `ListView` — refined version of today's card grid, snippet under title
- `GalleryView` — `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, taller cards with 3-line snippet clamp, soft gradient header using `accent`
- `KanbanView` — horizontal scroll, one column per `Note.kind` (or "Other"); column header shows count; cards are compact
- `DateView` — flat list grouped by `format(updatedAt, "MMMM yyyy")` then sorted desc; each entry shows day chip + snippet

All cards remain `<Link to={"/notes/" + n.id}>` and keep current hover/lift styling and the accent left-bar.

**Edits in `src/pages/TagDetail.tsx`:**
- Replace the existing `<CardSection title="Notes" …>` invocation with `<TagNotesPanel notes={taggedNotes} tagName={tagName} accent={accent} onAdd={() => void addEntity("note")} />`
- Keep `CardSection` for Tasks / Grocery / Projects unchanged

**No data or schema changes.** Uses existing `Note` shape (`id`, `title`, `body`, `kind`, `date`, `updatedAt`, `tags`).

## Out of scope

- Drag-to-reorder on Kanban (notes have no status field to persist into)
- View switchers for Tasks / Grocery / Projects sections
- Editing snippets inline
