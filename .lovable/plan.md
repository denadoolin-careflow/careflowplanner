## Goals

Five connected improvements: a tighter mobile CARE strip on Today, a more Obsidian-feel notes editor, a real tag system shared by tasks and notes, prettier color+icon labels, and an Ideas page that behaves like a tag-aware task list.

---

## 1. CARE methodology mobile alignment

**File:** `src/components/care/CareLoopIndicator.tsx`

- On mobile each phase pill currently stacks the icon above a tiny uppercase label, and on very narrow widths they overlap.
- Switch the mobile rendering to a single horizontal row: icon + label inline, smaller icon (`h-6 w-6`), label `text-[10px]` truncated, equal `flex-1 basis-0` columns so all four phases sit on one line at 360px+.
- Replace the dual hidden/visible label spans with one responsive label that shows next to the icon at every breakpoint.
- Reduce `nav` padding to `p-1.5` and gap to `gap-0.5` on mobile so four pills fit without wrap.

No business logic touched.

---

## 2. Notes editor — Obsidian-style toggles, indent, alignment

**Files:** `src/components/notes/BlockEditor.tsx`, `src/components/notes/NoteMarkdown.tsx`, `src/pages/Notes.tsx`

Editor refinements:
- Replace the current toggle/callout node with an Obsidian-style collapsible "toggle" block: a chevron that rotates, a one-line summary, and an indented child container that visually inherits the left guide line.
- Make `Tab` / `Shift+Tab` indent and outdent the current list item or toggle child (sink/lift list item commands).
- Add a 2px left guide line on indented children so nesting reads cleanly.
- Tighten typography: use `leading-[1.6]`, consistent `text-[15px]`, monospace inline code with `bg-muted/60 px-1 rounded`, and align bullets/numbers to a fixed gutter (`pl-6 -indent-6`) so text never staircases.
- Add a thin "indent guide" CSS rule for nested lists.

List preview (`Notes.tsx` cards):
- Strip markdown from the snippet shown in the notes list — render the first ~140 chars of plain text only (no `#`, `**`, `>`, etc.), with a small util `stripMarkdown(md)`.
- Keep full markdown rendering inside the note detail view.

---

## 3. Tags system for tasks + notes

Tags already exist as `string[]` on `Task` and `JournalEntry`. We'll formalize them.

**Migration:**
- New `public.tags` table: `id`, `user_id`, `name` (unique per user, case-insensitive), `color` (hex), `icon` (lucide name), timestamps. Standard RLS so each user only sees their own tags.
- Notes are stored in `home_notes` today — add a `tags text[]` column to `home_notes` so notes can carry tags like tasks do.

**Store:**
- `src/lib/store.tsx`: load tags, expose `tags`, `addTag`, `updateTag`, `deleteTag`. Map note rows to include `tags`.

**UI components (new):**
- `src/components/tags/TagChip.tsx` — colored pill with icon + name.
- `src/components/tags/TagPicker.tsx` — multi-select popover with search, "Create new tag" inline, color swatch + icon picker (reuses `IconPicker`). Used in `TaskEditor`, `QuickEditPopover`, note detail, and Ideas.
- `src/components/tags/TagManagerDialog.tsx` — rename, recolor, change icon, delete tag (with confirmation).

**Tag browse view:**
- New route `src/pages/Tags.tsx` (`/tags`) listing all tags as colored cards with counts.
- New route `src/pages/TagDetail.tsx` (`/tags/:name`) showing every task and note carrying that tag, grouped by type, with the same `TaskRow` / note card components.
- Nav entry under "Library" or alongside Notes.

**Filtering in existing lists:**
- `TaskListPage` and `Notes.tsx` get a "Filter by tag" chip row above the list.

---

## 4. Custom color + icon options for tags

- `TagPicker`'s "create" flow shows a 12-swatch color palette (warm / sage / sky / rose / amber / indigo / etc., all HSL semantic-friendly) and an icon grid (Sparkle, Heart, Star, Flag, Bookmark, Leaf, Sun, Moon, Compass, Tag, Flame, Cloud).
- Tag chips render with `style={{ backgroundColor: hsl from color, color: contrast }}` while still respecting dark mode via opacity overlays.
- Color + icon stored on the `tags` row (see migration) and reused everywhere a tag chip appears.

---

## 5. Ideas → task-style with tags

**File:** `src/pages/Ideas.tsx` (rewrite, keep the `ideas` store table for backwards compatibility — render existing `Idea` rows as `IdeaCard` plus allow converting to task; new captures save as tagged tasks with `inbox: true` and tag `idea`.)

- Header capture row mirrors task quick-add: title input + tag picker + Add button.
- Body becomes a single list of `TaskRow` instances filtered to tasks with the `idea` tag, grouped by user-selected tag, with the standard hover actions (schedule, convert, delete).
- Legacy `state.ideas` items render in a "Migrate older ideas" collapsible at the bottom with a one-click "Convert to tagged task" button.

---

## Technical details

```text
DB additions
  tags(id, user_id, name, color, icon, created_at, updated_at)  RLS by user_id
  home_notes.tags text[]                                          (default '{}')

Routes
  /tags             → src/pages/Tags.tsx          (grid of tag cards)
  /tags/:name       → src/pages/TagDetail.tsx     (mixed task+note list)

New components
  src/components/tags/TagChip.tsx
  src/components/tags/TagPicker.tsx
  src/components/tags/TagManagerDialog.tsx

Edited components
  src/components/care/CareLoopIndicator.tsx       (mobile layout)
  src/components/notes/BlockEditor.tsx            (toggle node, indent, guides)
  src/components/notes/NoteMarkdown.tsx           (plain-text snippet helper)
  src/pages/Notes.tsx                             (use snippet, add tag filter)
  src/pages/Ideas.tsx                             (rewrite as tagged tasks)
  src/components/tasks/TaskEditor.tsx             (TagPicker section)
  src/components/tasks/QuickEditPopover.tsx       (TagPicker inline)
  src/lib/store.tsx                               (tags CRUD, note tags)
  src/lib/nav.ts                                  (Tags nav link)
```

---

## Out of scope (call out if you want me to include)

- Per-user "favorite tags" or pinned tags.
- AI tag suggestions.
- Bulk re-tag from tag detail view.
- Migrating existing `Idea` rows automatically into the tasks table.

If any of those should be in, say the word and I'll fold them into this plan; otherwise reply approve and I'll start with the migration and work through the five sections in order.