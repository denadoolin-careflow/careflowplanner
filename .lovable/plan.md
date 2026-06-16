# Notes & Journal Redesign Plan

This is a large scope. I want to land it in phases so each ships working, not a single mega-PR that's hard to review. Here's the proposed sequencing — confirm or reshuffle and I'll start with Phase 1.

## What's already in place
- `src/pages/Notes.tsx`, `NoteDetail.tsx`, `Journal.tsx`, `JournalFlow.tsx`
- `src/components/notes/*` — `NotesHub`, `NotesSideNav`, `BlockEditor`, `NoteAIButton`, `LinkedNotesPanel`, `NoteContextRail`, `NoteTOC`, `NoteLinksSidebar`, hover preview, cover/icon pickers, AI markdown
- `src/components/journal/*` — `JournalEntryDialog`, project/recipient pickers, project panel
- Backend: `notes`, `journal_entries`, `note_links`, plus tags, tasks, calendar, family, pantry, care_*  tables. AI edge functions: `ai-notes`, `ai-journal`, `ai-cosmic-journal-insights`
- Auto-link helpers (`note-links.ts`, `extractBacklinks`), tags, daily-note get-or-create

Most building blocks exist — the work is composition, IA, and a few new surfaces, not a rewrite.

## Phase 1 — IA + three-column shell (Notes)
- Rework `Notes.tsx` into a three-column layout: `NotesSideNav` (left) · editor (center) · new `NoteIntelligencePanel` (right, collapsible).
- Left nav adds the requested sections: All, Journal, Favorites, Recent, Shared, Archived + Collections (Family, Medical, Household, Therapy, School, Personal) driven by tags/kind. Quick actions: New Note, New Journal Entry.
- Center reuses `BlockEditor` + floating save indicator (already auto-saves; surface state).
- Right panel = first pass: Related Tasks, Related Events, People mentioned, AI Summary, Suggested Actions (stub Create task / Add to grocery / Schedule reminder using existing stores).
- Mobile: right panel becomes a bottom sheet; left becomes a drawer.

## Phase 2 — Journal mode
- Convert `Journal.tsx` into a calming dashboard: Today's Reflection card (rotating prompts), Mood check-in wheel (6 moods listed), streak + emotional trend strip, "wins / themes" summary powered by `ai-cosmic-journal-insights` or a new `ai-journal-insights` action.
- Add `mood` + `prompt_id` columns to `journal_entries` (migration) for trends.
- Prompts library component with categories (Caregiving, Wellness, Parenting, Gratitude, Relationships, Self-Care, Reflection) — dismissible, never forced.

## Phase 3 — Smart capture + AI
- Universal Quick Capture FAB (Note / Voice / Journal / Checklist / Photo) — reuses `use-voice-dictation`, attachments, `QuickAddBar` patterns.
- Extend `ai-notes` with `summary`, `key_decisions`, `action_items`, `follow_ups` actions; auto-tag suggestions (people, projects, health, locations).
- Smart linking: surface Notes↔Tasks/Calendar/Pantry/Care/Family in the right panel using existing relations + `note_links`.

## Phase 4 — Timeline + Search
- New `/notes/timeline` view: chronological merge of notes, journal entries, tasks, events.
- Upgrade `UniversalSearchBar` filters: title, content, tags, person, date, category — instant results.

## Phase 5 — Polish
- Atmosphere-aware surfaces, soft cards, rounded corners, gentle shadows, mobile full-screen editor, swipe between notes, bottom action bar.

## Open questions
1. Start with Phase 1 only, or bundle 1+2?
2. For Collections (Family/Medical/etc.) — drive off existing tags, or add a new `collection` column on `notes`?
3. Mood check-in: store on `journal_entries` (new column) or on `mental_health_logs` (already exists)?

Reply with answers (or "go" to start Phase 1 with sensible defaults: Phase 1 only, tag-driven collections, mood on `journal_entries`).
