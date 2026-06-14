## Goal

The Daily Energy & Reflection card on `/today` currently has no way to act on the prompt. Add lightweight entry points so users can capture a journal entry or open/create a note inspired by the day's reflection — and surface the same in the header "Today" task popover and the Quick Add bar.

## 1. Fix & extend `DailyEnergyGuidance` (`src/components/today/rhythm/DailyEnergyGuidance.tsx`)

Add a small action row beneath the reflection:

- **Journal this** → calls `addJournal({ body: "<reflection>\n\n", type: "brain-dump", date: todayISO })` then navigates to `/journal` (or inlines a tiny expandable textarea like `JournalTodayWidget` does — preferred so users don't leave the page).
- **Open today's note** → `await getOrCreateDailyNote(todayISO)` then `navigate(\`/notes/\${note.id}\`)`.
- **New note** → `await createNote({ title: "", body: \`> \${reflection}\n\n\` })` then navigate to the new note so the reflection seeds it.

Use ghost-style chip buttons matching the card's sage accent. Keep the section visually intact (the user says it "appears broken" — confirm by re-reading the component and adding the action row inside the card so it feels purposeful, not a loose section).

Inline journal mini-form (collapsed by default):
- Click "Journal this" → expand a 2-line textarea + Save button (mirrors `JournalTodayWidget` pattern).
- On save: `addJournal` with today's date, toast "Saved to journal", collapse.

## 2. Today's task popover (`src/components/layout/HeaderNowStrip.tsx → TodayPreview`)

Add a thin action row above "Open Today →":
- **Daily note** → `getOrCreateDailyNote(todayISO)` → navigate.
- **New note** → `createNote({})` → navigate.
- **Journal** → navigate to `/journal`.

Small icon buttons (BookHeart / StickyNote / Plus) styled like the existing footer link.

## 3. Quick Add bar (`src/components/today/QuickAddBar.tsx`)

The bar already has a `note` kind that creates a note from typed text. Add one more affordance:

- A small **"Today's note"** button next to the kind switcher (only visible when `kind !== "note"` or always) that calls `getOrCreateDailyNote(todayISO)` and navigates — so users can jump into today's daily note in one tap without typing.
- Keep the existing `note` kind behavior (free-text → new note) unchanged.

## Technical notes

- Reuse: `createNote`, `getOrCreateDailyNote` from `src/lib/notes.ts`; `addJournal` from `useStore()`; `todayISO` from `src/lib/store`.
- Navigation via `useNavigate()` to `/notes/:id` and `/journal`.
- No schema changes, no new libs.
- Toasts via existing `sonner`.

## Out of scope

- No changes to the guidance text generator (`src/lib/daily-energy-guidance.ts`).
- No restyling of unrelated Today cards.
