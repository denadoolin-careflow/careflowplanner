# CareFlow Notes Editor — Craft/Capacities-style upgrade

Reuse what's already there — `BlockEditor.tsx` (TipTap w/ details/toggle, slash menu, toolbar, focus-block), `NoteIntelligencePanel.tsx`, `NoteContextRail.tsx`, `NoteTOC.tsx`, `NoteHoverPreview.tsx`, `NoteLinkChips.tsx`, `InteractiveNoteMarkdown.tsx`, `NoteDetail.tsx` (already has `focusMode` + Esc). Keep the sage/cream/gold dark aesthetic and rounded, glassy cards. No new deps beyond what's installed (TipTap, framer-motion, lucide, shadcn).

## 1. Smarter toggle lists (`BlockEditor.tsx`)
- Extend the existing `details` node styling in the ProseMirror CSS: rotate the marker arrow 180° with `transition-transform 200ms`, animate open with a CSS grid `grid-template-rows: 0fr → 1fr` height + fade trick (no JS measure).
- Add a TipTap keymap: `Alt+ArrowRight` opens the nearest `details`, `Alt+ArrowLeft` closes it; `Cmd/Ctrl+.` toggles.
- Slash-menu: add "Toggle heading" that wraps the current line in a details block whose summary is the current text.
- Add an input rule: typing `>` + space at the start of a line converts to a toggle (matching Craft).
- Support infinite nesting (details already nests; just tune left padding and connector line).

## 2. Smarter AI note parsing (real-time entity detection)
- New `src/lib/note-entities.ts`: pure client-side regex + `chrono-node`-style parsing already available via `nlp-task.ts` and `task-auto-detect.ts`. Extract `{ tasks, dates, people, places, events, links, files }` from the current markdown.
- New `src/hooks/useNoteEntities.ts`: debounce 400ms, memoize by body hash, expose a single `entities` object.
- Feed the sidebar (§3) from this hook. No writing interruption — detection is background only.
- Optional AI pass (throttled, existing `ai-notes` edge function) merges richer entities; falls back gracefully when offline.

## 3. Interactive sidebar (replace/reshape `NoteIntelligencePanel.tsx`)
Right rail becomes a stacked, collapsible workspace with these sections in order:

1. **Table of Contents** (moved from wherever it lives now; sticky, active heading highlighted on scroll via `IntersectionObserver`).
2. **Tasks** — interactive checkboxes bound to the detected task lines. Check → strike + toggles the markdown `- [ ]`/`- [x]` in place via a TipTap transaction. Row actions: edit inline, delete, convert to plain text, assign due date (existing date popover), drag to reorder.
3. **Linked items** — pulls from `note-links.ts` matcher (Daily notes, journals, astrology, contacts, recipes, projects, care plans, budgets). Click opens `NoteHoverPreview`-style quick preview dialog (no navigation).
4. **AI summary** — reuses existing `ai-notes` summary call; regenerates on debounced body change with a shimmer while pending.
5. **Suggested actions** — chips driven by entities: Create task, Add to calendar, Save recipe, Add to grocery list, Add reminder, Create project, Link existing note. Each dispatches to existing stores.

Each section: shadcn `Collapsible`, spring open/close (framer-motion), remembers open state per-user in localStorage.

## 4. Rich inline cards
- Extend the current `@mention`/`[[wikilink]]` decoration in `InteractiveNoteMarkdown.tsx` and add a TipTap node view `InlineEntityCard` for the editor itself.
- Card contents by entity type (people → avatar + role + last-updated; project/note → icon + counts + updated; recipe → thumb + time; event → date chip).
- Behaviors: expandable (chevron), hoverable (uses existing `NoteHoverPreview`), draggable (HTML5 drag with existing patterns), clickable (opens quick peek), resizable via `data-size="sm|md|lg"` attribute, collapsible back to a chip.

## 5. Quick peek (`NoteHoverPreview` upgrade)
- Single `<QuickPeekProvider>` mounted in `NoteDetail`. Any element with `data-peek-id` / `data-peek-type` triggers a floating card on hover (200ms delay) with entity summary + top actions. No navigation needed; "Open" button still available.
- Types: note, task, event, contact, recipe, astrology transit, project.

## 6. Focus mode polish (`NoteDetail.tsx` already has the scaffold)
- Ensure Focus hides: left sidebar, right rail, floating AI FAB, toolbar (fade toolbar on idle, reveal on caret movement), attachment area, properties strip.
- Add a subtle floating "Exit focus (Esc)" pill top-right; keep vignette background.
- Persist focus-mode preference per-note in localStorage.

## 7. Cleaner header
- Collapse the busy header into a single line: `Updated Jul 3 · 5:19 PM · #Astrology #Journal #Personal` plus a `…` menu for cover/icon/template/export. Title stays large.
- Everything else (properties, share, links count) moves behind the `…` menu or into the right rail.

## 8. Collapsible attachments
- Replace the always-visible attachment strip with a `📎 Add files` button that expands into a Popover: Drag-drop zone, Browse, Paste image, Paste PDF, Upload voice (reuse `use-audio-recorder`). Auto-collapse ~1s after successful upload; show attached count on the pill.

## 9. Right sidebar order
Final stack (top → bottom, all sticky within the rail):

```text
┌─ Table of Contents (sticky top)
├─ Intelligence
│    Tasks
│    Linked pages
│    People
│    AI summary
│    Suggested actions
```

TOC uses smooth-scroll on click and highlights the current heading during scroll.

## 10. Better writing experience (CSS-only tweaks in `BlockEditor.tsx` ProseMirror styles)
- Line-height 1.7, block spacing +25%, wider column (`WIDTH_PX.wide` becomes the default for new notes), refined heading scale (H1 2.25rem, H2 1.6rem, H3 1.2rem), softer `hr` (`bg-border/40`), better bullet indent (1.25rem, marker color muted), smooth caret via `caret-color: hsl(var(--primary))`.
- Respect existing `useEditorPrefs` (density/width/fontScale).

## 11. Microinteractions
- Toggle open: 220ms ease-out height + fade.
- Checkbox complete: scale 0.9→1.05→1 with check draw-in (SVG stroke dash).
- Inline cards: `hover:-translate-y-0.5 hover:shadow-md` transition 180ms.
- Sidebar sections: framer-motion spring `{stiffness: 260, damping: 26}`.
- TOC active heading: soft primary underline slides between items.
- AI entity detection: subtle shimmer overlay on the sidebar section header (no content flicker).
- New cards: `animate-in fade-in slide-in-from-bottom-1` 250ms.
- Drag & drop: reuse existing insertion-bar pattern (`bg-primary shadow-[0_0_12px_hsl(var(--primary))]`).

---

## Technical notes / file map
- **Edit** `src/components/notes/BlockEditor.tsx` — toggle keymap, input rule, ProseMirror CSS for details animation, typography tweaks, inline card node view registration.
- **Edit** `src/pages/NoteDetail.tsx` — header simplification, attachments popover, sidebar order, focus-mode polish, mount `QuickPeekProvider`.
- **Rework** `src/components/notes/NoteIntelligencePanel.tsx` — becomes the stacked interactive rail (TOC + Tasks + Linked + Summary + Actions).
- **Edit** `src/components/notes/NoteTOC.tsx` — active-heading `IntersectionObserver`, smooth scroll.
- **Edit** `src/components/notes/NoteHoverPreview.tsx` → generalize into `QuickPeek`.
- **New** `src/lib/note-entities.ts`, `src/hooks/useNoteEntities.ts`.
- **New** `src/components/notes/InlineEntityCard.tsx` (TipTap node view + read-mode renderer).
- **New** `src/components/notes/AttachmentPopover.tsx`.
- No schema changes. No new backend functions (reuse `ai-notes`).

## Delivery order
1. Sidebar restructure + TOC move + microinteraction pass (§3, §9, §11) — biggest visible win.
2. Smarter toggles + writing typography (§1, §10).
3. Entity detection + AI summary + suggested actions (§2, §3 wiring).
4. Inline cards + Quick peek (§4, §5).
5. Header + attachments cleanup + focus polish (§6, §7, §8).

## Out of scope
- No changes to the note storage schema, sync queue, or notes list pages.
- No new AI providers.
- No changes to the mobile notes shell beyond CSS reflow from the rail/header edits.
