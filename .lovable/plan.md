# Craft-style block links and synced block embeds

Two phases. Phase 1 makes every paragraph, heading, list item, toggle and callout addressable. Phase 2 lets you show a block from another note inside the current note and keep the two in sync.

## Phase 1: Block IDs and "Copy link to block"

**What you'll see**
- The six-dot handle beside each block gets a **Copy link to block** action. On phones it's in the long-press menu.
- Opening a link like `/notes/<note>#b-k3f9a2` scrolls to that block and gives it a soft highlight for about 2 seconds.
- Typing `[[` lets you go deeper than a note: pick a note, then a heading or paragraph inside it. This adds a chip showing a short snippet, and tapping the chip jumps to that block.
- When you link a heading, the jump lands on the heading, and the section opens if it was folded.

**Rules**
- A block gets its ID the first time someone links to it, not when it's created. This keeps saved notes clean.
- IDs stay with the block when you edit, move or fold it. If you copy and paste a block, the pasted copy gets a new ID.
- If a linked block is deleted, the chip says "Block removed" and links to the note instead.

## Phase 2: Synced block embeds (/embed block)

**What you'll see**
- Type `/embed block`, search across your notes, and pick a heading or block.
- The embed appears as a soft card that shows the source note's title and a "Jump to source" link.
- Picking a heading embeds its whole section, down to the next heading at the same or higher level.
- Two modes, switched from the card menu:
  - **Read-only** (default): shows the latest version of the source block.
  - **Synced**: you can edit inside the card, and changes save back to the source note.
- Embeds update live when the source note changes in another tab or on another device.
- Guards: a block can't embed itself, embed chains stop at 2 levels, and if the source is gone the card says "Source removed".
- In the source note, a small "Embedded in 2 notes" marker next to the block lists where it's used.

## Order of work
1. Block ID attribute, saving, and loading (no visible change yet)
2. Copy link to block, jump on open, highlight
3. Block-level `[[` picker and reference chips
4. `/embed block` card in read-only mode with live refresh
5. Synced editing mode, plus the "Embedded in" marker

## Technical details
- **Storage:** note bodies stay markdown. The block ID is saved as a trailing marker `^b-xxxxxx` at the end of the block (Obsidian-style). Turndown writes it from a global `blockId` attribute on paragraph, heading, listItem, taskItem, toggle and callout nodes. `bodyToHtml` reads it back into `data-block-id`. Other markdown viewers (`NoteMarkdown`, `InteractiveNoteMarkdown`, previews) remove the marker before display. The schema doesn't change.
- **Resolver:** `src/lib/notes/blocks.ts` parses a note body into blocks `{id, type, level, text, markdown}`. It returns a block, or a section for a heading, and caches results per note. Search runs over cached notes for the picker.
- **Nodes:** `BlockRefChip` (inline atom, attrs `noteId`, `blockId`) and `BlockEmbedNode` (block atom, attrs `noteId`, `blockId`, `mode`). Both save as tokens, `((noteId#blockId))` and `!((noteId#blockId))`, so they round-trip through markdown.
- **Synced writes:** the embed renders a nested `BlockEditor`. When you edit, it replaces only that block or section in the source body, through `updateNote` with a debounce. It re-reads the source first to avoid overwriting newer changes, and on a conflict it falls back to read-only with a notice.
- **Live updates:** reuse the existing notes realtime/refresh notification.
- **Backlinks:** the "Embedded in" list comes from scanning bodies for `((noteId#`, the same way backlinks work today.
- Record the storage decision in AGENTS.md.
- Limitation: blocks written before this change have no ID until someone first links to them. Linking adds the ID on save.
