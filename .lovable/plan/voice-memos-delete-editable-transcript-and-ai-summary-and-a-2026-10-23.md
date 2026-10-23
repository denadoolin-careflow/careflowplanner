# Voice memos: delete, editable transcript and AI summary, and a memo library

## 1. On each voice memo card in a note
- **Delete**: a trash button with an "Are you sure?" step. It removes the card from the note and deletes the recording from your account.
- **Transcript inside the card**: after you tap Transcribe, the text shows in an editable box in the card (not as loose text below it). Tap to edit; it saves on its own. "Re-transcribe" asks before it replaces your edits.
- **AI summary**: a "Summarize" button writes a short summary plus action items into an editable box in the card. You can edit it or regenerate it.
- Memos you already made, with transcripts sitting below them, keep working as they are.

## 2. Voice Memos library
- A new **Voice Memos** page under Notes. It lists every memo with date, length, the note it's in, a play button, and the transcript and summary.
- Search transcripts and summaries, filter by date or by "has transcript", and sort newest or oldest first.
- Open the note a memo lives in, edit transcript or summary, or delete a memo from here. Changes show up in the note too, and the other way round.
- Memos sync across your devices.

## Technical details
- New `voice_memos` table: id, user_id, storage path (unique), note_id (nullable), duration_ms, mime, transcript, summary, transcript_edited bool, created/updated. Owner-only RLS, grants, updated_at trigger, realtime on.
- Recording inserts a row; the memo card shows `data-voice-memo-id` and reads/writes the row. Older cards without an id get a row created from their path the first time they load.
- Delete: removes the storage object, the row and the editor node. Deleting the card in the note also deletes the row and file. A memo removed only by deleting the whole note shows in the library as "Not in a note".
- `transcribe-voice-memo` saves the transcript to the row. A new `summarize-voice-memo` function (Lovable AI, default model) saves the summary. Both check that you own the memo.
- New page route `/notes/voice-memos`, added to NAV_SUBPAGES for Notes. Record the structural rule in AGENTS.md.
- Tests: deleting a memo removes its row and node, and editing a transcript keeps your edits when the memo reloads.
