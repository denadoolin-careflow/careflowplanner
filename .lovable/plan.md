## Goal

Make tags first-class connective tissue: type `#name` anywhere in a note to autocomplete + insert a styled tag chip, click a tag to land on a beautiful card-grid hub for that tag, and add a "+" menu to create a task, note, grocery item, or project pre-tagged with it. Upgrade the selection bubble menu with Checklist / Task / Tag actions and tighten editor styling toward Craft / Notion / Things 3.

## 1 — Inline `#tag` autocomplete in the block editor

`src/components/notes/BlockEditor.tsx` already has a generic `makeSuggestion` factory used by `/` (slash) and `@` (refs). Add a third instance for `#`:

- New `hashtagExtension` (Tiptap `Extension.create`) registered alongside `slashExtension` and `refExtension`.
- `char: "#"`, `allowSpaces: false`, items pulled from `useTags()` (live registered tags) plus any orphan tags collected across `state.tasks`, loaded notes, and grocery items — same union currently built in `src/pages/Tags.tsx`, lifted into a small `useAllTagNames()` hook in `src/hooks/use-tags.ts` so both places share it.
- Query that doesn't match any existing tag shows a "Create #query" row at the top.
- `onSelect` inserts a TipTap `text` node `#name` wrapped in a `link` mark with `href="/tags/<encoded>"` and `class="tag-chip"` (mirrors the existing `ref-chip` / `task-chip` pattern), followed by a space.
- Persist tag attachment: after insertion, parse the note's text for `#word` tokens in `onUpdate` (debounced) and merge unique names into `note.tags` via existing `updateNote` API so the tag also appears in the note's tags array and on the TagDetail page even before save.

Style: add a `.tag-chip` rule next to existing `.ref-chip` / `.task-chip` styles (likely in `src/index.css` or the block editor CSS file) — pill background `bg-primary/10`, `text-primary`, `rounded-md`, `px-1`, no underline, hover ring.

## 2 — Tag grid hub (`/tags/:name` redesign)

Rewrite `src/pages/TagDetail.tsx` from list rows → card grid.

- Header row: large `TagChip`, counts, plus a primary "+ Add to this tag" button.
- "+" opens a `DropdownMenu` with: **Task**, **Note**, **Grocery item**, **Project**. Each option creates the entity pre-tagged with the current tag name:
  - Task: `addTask({ title: "Untitled task", tags: [tagName] })` then navigate to `/anytime?taskId=...`.
  - Note: `createNote({ title: tagName, tags: [tagName] })` then navigate to `/notes/:id`.
  - Grocery item: append to the active list via `grocery-lists` API with `tags: [tagName]` if supported (fallback: title-only entry); land on `/pantry` or active grocery view.
  - Project: `addProject({ name: "Untitled project", tags: [tagName] })` then navigate to the project route used elsewhere in the app.
- Grid: 4 sections (Tasks, Notes, Grocery, Projects), each `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` of `cozy-card`-style cards showing title, meta line (date / status / count), and a colored accent strip in the tag color from `TagChip`.
- Empty section renders a soft dashed-border card with a one-click shortcut that opens the same "+" flow scoped to that entity type.
- Keep "Ideas" carve-out from the current code as a sub-filter on the Tasks card.

## 3 — Selection bubble menu upgrades

In `BlockEditor.tsx`'s `<BubbleMenu>`:

- New **Checklist** button — converts the selected lines into a TipTap task list (`editor.chain().focus().toggleTaskList().run()` on the wrapping range so multi-line selections become individual checkboxes).
- New **Task** button — promotes the selected text to a real task via existing `addTask({ title: selectionText, tags: extractedHashtags })`, then wraps the original selection with the `task-chip` link to `/anytime?taskId=...`. Re-use the existing `promoteTaskItemToTask` logic, generalized to accept any selection.
- New **Tag** button — opens a tiny inline popover (built with shadcn `Popover`) listing existing tags + free-text input; selecting one inserts a `#name` chip at the end of the selection (no replacement) and merges the name into `note.tags`.
- Reorder buttons into clusters separated by the existing `|` divider: format → headings → structure (Checklist / Task / Tag) → link.

## 4 — Editor look & feel polish (Craft / Notion / Things 3)

Tighten the prose styles already living in the block editor's stylesheet:

- Larger first H1, looser leading on body (`leading-[1.65]`), 17px base on desktop, 16px on mobile.
- Softer chip pills (tag-chip, ref-chip, task-chip) at uniform `rounded-md`, micro-shadow on hover.
- Bubble menu: switch container to `rounded-2xl`, `border-border/40`, `shadow-xl`, `backdrop-blur-xl`, 6px button radii, subtle hover scale.
- Add Things-3-style colored bullet for task items (small filled circle that fills on check, with a 120ms ease).
- Replace the slash menu's row hover with a subtle `bg-muted/60` highlight and a thin left accent in `primary`.

Pure CSS — no behavioral changes beyond what's described above.

## Out of scope

- No new database tables. Tags already live as string arrays on tasks/notes; grocery items and projects already support `tags?: string[]`.
- No realtime collab / sharing changes.
- No global search rework — just the new `#` autocomplete inside notes.

## Technical notes

- `useAllTagNames` hook merges `useTags()` registered names with orphan names from `state.tasks`, `listNotes()` results, grocery items, and projects.
- Hashtag detection regex: `/(?:^|\s)#([\p{L}\p{N}_-]{1,40})/gu` — Unicode-aware, ignores leading `#` inside URLs (only matches after whitespace/start).
- New CSS goes in the same file that already defines `.ref-chip` / `.task-chip` (search for those selectors to find it).
- Files touched: `BlockEditor.tsx`, `TagDetail.tsx`, `src/hooks/use-tags.ts` (add hook), plus a small `TagPickerPopover` component under `src/components/tags/`.

## Verification

- Type `#fam` in a note → suggestion menu appears, picking "family" inserts a `#family` chip linked to `/tags/family`; the tag also shows up in the note's sidebar tag list.
- Open `/tags/family` → 4-section card grid; clicking "+" → "Task" lands on a new task pre-tagged with `family`.
- Select two lines of plain text in a note → bubble menu's "Checklist" button turns them into checkboxes; "Task" promotes the selection into Tasks; "Tag" inserts a chip without destroying the selection.
- Editor visually matches the Craft/Notion/Things 3 reference: tighter chips, larger headings, plush bubble menu.
