# Beautiful note editor with images (Notion/Craft style)

## 1. Image support

**New public storage bucket `note-images`** (created via storage tool, not SQL).
RLS policies (migration) on `storage.objects` restrict uploads/updates/deletes to the owner's `{uid}/...` folder; public read is implicit since the bucket is public.

**Tiptap image extension**:
- Add `@tiptap/extension-image` dependency.
- Wire it into `BlockEditor` with `inline: false`, `allowBase64: false`.
- Add an upload helper `uploadNoteImage(file)` in a new `src/lib/note-images.ts` that uploads to `note-images/{uid}/{uuid}-{name}` and returns the public URL.

**Three ways to add an image:**
1. Slash command `/image` → opens hidden `<input type="file" accept="image/*">`.
2. Toolbar "Image" button (in main sticky toolbar) — same trigger.
3. Drag-and-drop / paste — `editorProps.handlePaste` and `handleDrop` intercept image files, upload, then insert via `editor.chain().setImage({ src }).run()`.

**Inline image rendering:**
- Custom image render via `addNodeView` is overkill — instead use a small CSS pass: rounded corners, soft shadow, max-w-full, mx-auto, mt-3 mb-3, hover ring.
- BubbleMenu when an image is selected → "Remove" and "Open original" buttons.

Markdown round-trip: turndown already serializes `<img>` to `![](url)`; `marked` parses it back. Existing `bodyToHtml`/`htmlToMarkdown` work as-is.

## 2. Cover image

**Add `cover_url text` column to `public.notes`** (migration). Update `Note` interface, `fromRow`, and `updateNote` to handle `coverUrl`.

In `NoteDetail`:
- Above the title, render a 160-220px cover area.
  - If `cover_url` set: full-bleed `<img>` with subtle gradient fade-to-card at the bottom.
  - Else: a subtle "Add cover" button that fades in on header hover.
- "Change cover" / "Remove cover" controls overlay the cover on hover.
- Reuse `uploadNoteImage` for the cover too.

## 3. Editor UX/UI polish — Notion/Craft feel

`NoteDetail.tsx`:
- Drop `cozy-card` wrapper; use a clean centered page (max-w-[760px], mx-auto, px-6 md:px-10, py-8) with no border, just background.
- Cover above title; title input becomes larger (text-4xl md:text-5xl), tighter leading, no border.
- Meta row (updated time + tags) gets a single soft row beneath the title.
- Hide right TOC into a slim floating panel that auto-hides when narrow (`hidden 2xl:block`), Craft-style.

`BlockEditor.tsx`:
- Sticky toolbar: round it more (rounded-2xl), reduce height, give it a stronger blur, only appear on scroll / focus (already sticky — tighten styling only).
- Slash menu items: group into sections (Basic / Media / Embeds / Advanced), bigger icon tile, secondary description line on hover.
- BubbleMenu: tighter spacing, pill segments separated by hairlines.
- `prose` tweaks via existing `block-editor` CSS class: tighter paragraph leading (1.65), more breathing space around H1/H2, refined `:focus` caret color (already themed).
- Placeholder text refined to "Type ‘/’ for blocks, ‘@’ to mention, drag an image…".
- Add subtle drag-over highlight on the editor surface (`drag-active:ring-2 ring-primary/40`) using state + handleDOMEvents.

No changes to suggestion plumbing, hashtag plugin, toggle keymap, AI button, links sidebar, or backlinks behavior.

## 4. Files touched

- `package.json` — add `@tiptap/extension-image`.
- `src/lib/note-images.ts` — new upload helper.
- `src/lib/notes.ts` — add `coverUrl`, persist via `updateNote`.
- `src/components/notes/BlockEditor.tsx` — image extension, slash item, toolbar button, paste/drop, drag-over highlight, slash-menu grouping, minor toolbar/bubble styling.
- `src/pages/NoteDetail.tsx` — cover image, refreshed layout/typography.
- `src/index.css` (or existing `block-editor` styles) — image styling, cover gradient, drag-over ring, tightened prose.
- 1 migration: add `cover_url` column + storage RLS for `note-images`.
- 1 storage tool call: create `note-images` public bucket.

## Out of scope
- No embeds (YouTube/Twitter), no tables, no full-text search changes, no AI image generation, no comment threads. Daily notes get the same cover/image treatment automatically.
