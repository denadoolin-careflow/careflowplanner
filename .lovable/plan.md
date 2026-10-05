# CareFlow Notes: calm second-brain redesign

## Goal
Refine only the Notes hub and note-reading experience into a mobile-first, dark-plum “second brain” that prioritizes capture and real note content while preserving every existing note, editor feature, view, filter, and data flow.

## Notes hub
- Add a Notes-specific focused shell with the `CAPTURE · ORGANIZE · REFLECT · ACT` philosophy, compact menu/search/more controls, and no time or weather inside the Notes header.
- Add an inviting quick-capture surface that creates a real note and opens the existing editor.
- Replace the six-card analytics grid with one short insight band showing total notes, this week, streak, and a link to deeper insights.
- Add a horizontal mobile filter row for All, Pinned, Recent, Favorites, and Tags; reuse existing collections and tag filtering, and treat Favorites as pinned until the data model gains a distinct favorite field.
- Present up to three pinned notes in a compact horizontal carousel with covers, previews, tags, dates, pin state, and existing overflow actions.
- Make All Notes the visual focus with List, Grid, and Compact modes; keep advanced Notebook, Outline, Board, Table, Timeline, Calendar, and Connections views available from the overflow menu.
- Add a mobile Spaces drawer using meaningful, tag-backed groupings (All Notes, Life, Care, Ideas, Planning, Reflection, Family, Work) with live counts, plus the existing tags and tag manager.
- Preserve search, sorting, preview density, templates, period notes, files, note hover previews, inline editing, pin/archive/delete, and context rails.

## Note view
- Apply the same Notes-specific plum styling to the existing editor without replacing its autosave, history, covers, properties, attachments, backlinks, queries, block links/embeds, planner tools, or rich editor.
- Simplify the mobile top row to Back, Pin, Cover/Folder, and More while keeping secondary tools available from menus.
- Strengthen cover, title, date/time, word count, tags, content, and heading hierarchy for a calmer reading/writing flow.
- Surface existing note intelligence as optional CareFlow connections; never create tasks, events, care items, projects, or reminders without confirmation.

## Design and accessibility
- Add page-scoped semantic Notes tokens for dark plum surfaces, lavender selection, dusty rose, warm beige, sage, and muted gold; preserve the rest of CareFlow.
- Use the existing serif display and rounded sans typography, restrained botanical details, subtle lift/press motion, and reduced-motion fallbacks.
- Keep controls at least 44px on mobile, label icon-only actions, retain focus-visible states, use semantic headings/landmarks, and prevent horizontal page overflow.
- Keep the existing bottom dock stable and ensure Notes is visibly selected when its route is active.

## Verification
- Exercise search, quick capture, filters, sorting, view switching, spaces/tags, pinning, opening a note, and returning to the list with real authenticated data.
- Check 390×844 and desktop layouts for overflow, readable text, touch targets, bottom-dock stability, and runtime/build errors.
