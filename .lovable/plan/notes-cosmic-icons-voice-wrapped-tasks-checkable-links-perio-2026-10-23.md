# Notes: cosmic icons, voice, wrapped tasks, checkable links, period templates

## 1. Moon, planet and zodiac icons + any emoji
- Property and choice icon picker gains three new tabs: **Moon** (8 phase glyphs), **Planets** (Sun to Pluto, Chiron, nodes) and **Zodiac** (12 signs), drawn as glyphs in the property's chosen color.
- New **Emoji** tab with search, plus a "paste any emoji" box, for properties, choices and the note's own icon.
- Smart defaults: Moon sign choices show their zodiac glyph; Moon phase choices show their phase glyph (still changeable).

## 2. Dictation and voice memos in notes
- A mic button in the note toolbar: **Dictate** types your words live into the note where the cursor is.
- **Record voice memo**: records audio, saves it to your account, and drops a playable memo card into the note, with an optional "Transcribe" button that adds the text below it.

## 3. Wrap scheduled task text in the notebook planner
- Tasks in the notebook's schedule/planner pane wrap onto multiple lines instead of being cut off, on phone and desktop.

## 4. Checkable tasks in "Linked to"
- Each linked task gets a round checkbox; tapping completes it (same chime/feel as elsewhere) and it shows done with strikethrough per your preference. Other linked items stay as links.

## 5. Day, week and month property templates
- In Settings > Notes (and from any daily/weekly/monthly note via "Edit template"), set up a template for each period:
  - **Prompts** written into the note body, e.g. Intention for the week, Goal, Highlights, Challenges, Ideas, Memories.
  - **Properties** pre-added, e.g. Mood, Goal, Weekly intention.
  - **Connections** auto-filled from CareFlow for that date range: Appointments, Goals, Cosmic events, Meals, Meds, Moods, Connections (people check-ins) — shown as linked sections you can tap through.
- Sensible starter templates for each period; new day/week/month notes use them automatically, and an "Apply template" button fills older ones without overwriting what you wrote.

## Technical details
- Glyph icons: extend the shared property icon registry with text-glyph entries (`glyph:♈`, `emoji:🌿`) rendered by PropertyStyleDisplay; stored in the existing synced note_property_styles map, no schema change.
- Dictation reuses `useVoiceDictation`; memos reuse `useAudioRecorder`, upload to a private storage bucket `note-audio` (per-user folder RLS), embedded as `data-voice-memo` HTML in the markdown body; transcription via existing speech-to-text gateway route `/v1/audio/transcriptions` (`openai/gpt-transcribe`) in an edge function.
- Wrapping: replace `truncate`/`line-clamp-1` on schedule-pane task rows with `whitespace-normal break-words`.
- NoteLinksSidebar: for task entities render a checkbox calling `toggleTask`.
- Period templates stored in a synced per-user row (jsonb: day/week/month → prompts, properties, connection sections), extending the existing daily-note template; connection sections render live from store data by the note's date range rather than copying data in.
