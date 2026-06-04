## Goal

When viewing a caregiving profile (`PersonDashboard`), surface every memory and journal entry tied to that person — with their photos/attachments — in a single panel. Make it easy to link entries to a person from both the Journal and the Memory editor.

## Data model (no migration needed)

- `memories.recipient_ids uuid[]` already exists → the canonical link.
- `journal_entries.linked_ids jsonb` already supports `{type, id, label}` entries → use `{type: "recipient", id: recipient.id, label: recipient.name}`.
- Recipient "tag handle" = slugified `recipient.name`; we'll also match journal `tags[]` containing that handle for back-compat.

No schema change. Everything works inside existing RLS.

## 1. Helpers — `src/lib/person-memories.ts` (new)

```ts
export function memoriesForRecipient(memories: Memory[], recipientId: string): Memory[]
export function journalsForRecipient(entries: JournalEntry[], recipient: {id; name}): JournalEntry[]
export function recipientTagHandle(name: string): string  // lower-kebab
export function allAttachmentsForRecipient(...): {src, kind, source: "memory"|"journal", parentId, date, caption}[]
```

Filters:
- Memories where `recipientIds.includes(recipient.id)`.
- Journals where `linkedIds` has `{type:"recipient", id}` **or** `tags` includes the handle.

## 2. New section — `src/components/caregiving/PersonMemoriesSection.tsx`

Renders inside `PersonDashboard` (added after `PersonTrendsSection`). Three subviews behind small tabs (`Photos · Memories · Journal`):

- **Photos**: square thumbnail grid from `allAttachmentsForRecipient` (images only). Click → opens existing `MemoryLightbox` for memory-sourced images, or a lightweight image lightbox for journal-sourced ones.
- **Memories**: list of `MemoryCard`s (reuse existing component) sorted by `date` desc.
- **Journal**: compact cards (date · title/body excerpt · tag chips · attachment count). Click → routes to `/journal?focus={id}` (existing route accepts focus param if available; otherwise scrolls to entry).

Empty state CTA: "Tag a memory or journal entry with {name} to see it here" + two buttons → "New memory" (opens `MemoryEditor` with `recipientIds=[id]` preselected) and "New journal entry" (routes to `/journal?recipient={id}`).

Loads memories via `listMemories()` once, cached in component state; journals come from `useStore().state.journal`.

## 3. MemoryEditor — preselect recipient

`MemoryEditor` already supports `recipientIds`. Make `PersonMemoriesSection`'s "New memory" button open it with that prop preset. No editor changes needed beyond accepting an `initialRecipientIds` prop if not already present (verify; add if missing).

## 4. Journal — recipient picker

`src/pages/Journal.tsx` and `src/pages/JournalFlow.tsx` editor toolbar: add a "Link person" popover next to the existing project linker. Pulls `state.recipients`, multi-select. On save, append to `linkedIds` as `{type:"recipient", id, label: name}` and also add the slug to `tags` so legacy tag filters work.

Read `?recipient={id}` query param on mount and preselect that recipient.

## 5. PersonDashboard wiring

Add `<PersonMemoriesSection recipient={recipient} />` after `<PersonTrendsSection />` in `src/components/caregiving/PersonDashboard.tsx`.

## Out of scope

- Cross-syncing existing untagged entries (user backfills via the new pickers).
- Loved-ones (`loved_one_ids`) parallel surface — same pattern but not requested here.
- Server-side full-text search across linked entries.
- New tables, RLS, or migrations.

## Deliverables

- `src/lib/person-memories.ts` (new)
- `src/components/caregiving/PersonMemoriesSection.tsx` (new)
- `src/components/caregiving/PersonDashboard.tsx` (mount the section)
- `src/pages/Journal.tsx` + `src/pages/JournalFlow.tsx` (recipient picker + `?recipient=` param)
- `src/components/memories/MemoryEditor.tsx` (verify/accept `initialRecipientIds` prop)
