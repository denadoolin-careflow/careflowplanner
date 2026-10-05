# Notes capture, atmosphere, and notebook views

## What will change
- Replace the current tap-only “What’s on your mind?” surface with an inline NLP-aware typing box. Recognized dates, times, priorities, tags, areas, and projects will highlight while typing.
- Add a destination action beside the box so the same text can become a new note, be appended to any existing note selected from a searchable list, or become a real task through the existing task parser and task store. Enter will use the currently selected destination, success will clear the box, and failures will keep the text intact.
- Remove the fixed plum override from Notes and map its page-scoped surfaces, borders, accents, glow, and typography to the currently selected CareFlow atmosphere. The calm Notes hierarchy remains, but changing atmosphere will update Notes immediately.
- Promote Notebook and Calendar beside the standard Notes view controls. Notebook becomes the default primary view for period notes, with a month-first gallery of notebook covers/cards showing monthly, weekly, and daily writing at a glance.
- Let each monthly notebook open into the existing editable month → week → day notebook experience, preserving templates, inline editing, hover previews, sorting, written/blank filters, and direct note navigation.
- Keep Calendar as an adjacent primary view so users can switch directly between notebook gallery and dated note calendar without opening the advanced menu. Existing list, grid, compact, outline, board, table, timeline, filters, Spaces, and tags remain available.

## Technical details
- Reuse `NlpHighlightedInput`, the existing task parser/store, `createNote`/`updateNote`, and existing note search data; no new database tables or duplicate note/task models.
- Store only the chosen Notes view and notebook display preference locally, following existing Notes and notebook preference patterns.
- Refactor the current notebook tree into reusable month summaries plus a selected-month detail state so gallery and expanded notebook share the same period-note records.
- Use semantic atmosphere tokens already applied through `data-atmosphere`; remove Notes-only hardcoded color overrides while retaining Notes-specific layout classes.

## Verification
- Type NLP-rich text and verify creating a task, creating a note, and appending to a selected note each persists and opens or refreshes correctly.
- Change atmosphere and confirm the Notes hub, Spaces panel, and note editor update immediately with readable contrast.
- Verify notebook gallery, month opening, inline period-note editing, and Calendar switching on phone and desktop sizes.
- Confirm all existing Notes views, search, filters, pinned notes, tags, and editor navigation still work without overflow or runtime/build errors.
