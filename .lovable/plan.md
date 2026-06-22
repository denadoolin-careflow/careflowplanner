## Goal

Make voice capture feel effortless on mobile via a hold-to-record gesture with clear timer feedback, let users edit task details before they're saved, and tighten the Quick Capture + Categories + Tags experience.

## 1. Hold-to-record voice capture (mobile-first)

Edit `src/pages/Inbox.tsx` and replace the current tap-to-start mic with a press-and-hold mic.

- **Gesture**: replace the small mic affordance with a prominent circular mic button (right side of capture input on desktop; a big floating mic button under the input on mobile). Use `onPointerDown` / `onPointerUp` / `onPointerCancel` / `onPointerLeave` (covers touch + mouse). On `pointerdown` → start recording after a 180ms hold (prevents accidental fires); on `pointerup`/`leave` → stop and transcribe. Add `pointer-events: none` for `touch-action: none` to avoid scroll interference.
- **Slide-to-cancel** (iMessage-style): while holding, if the user drags more than ~80px to the left, mark `willCancel=true`; on release in that state, call `recorder.cancel()` instead of `stop()`. Show "← Slide to cancel" hint inline.
- **Feedback while held**:
  - Mic button scales up (1.0 → 1.15) and pulses a soft rose halo (already styled).
  - Live `mm:ss` timer next to the button.
  - Animated waveform-ish 3-dot bouncing indicator (CSS only, respects `prefers-reduced-motion`).
  - Haptic tap on start/stop via existing `src/lib/haptics.ts`.
- **Tap (short press) fallback**: if pointer is released in <180ms before recording starts, show a one-time toast: "Hold the mic to record" so the gesture is discoverable.
- Keep desktop tap-to-toggle behavior intact (the existing Stop button remains for the recording overlay) — only the *start* gesture changes on touch.

## 2. Edit task detail before creating tasks

Today, voice transcripts that parse to tasks are saved straight to the inbox. Add a confirm-and-edit step.

- New component `src/components/inbox/VoiceReviewSheet.tsx`: a bottom sheet (Drawer from `@/components/ui/drawer`) that opens after transcription completes when `tasks.length > 0`.
- For each suggested task, render an editable row: title input, Area chip (popover from `AREAS`), When chip (Today / Tomorrow / pick date), Energy chip (Low/Med/High), Priority chip, Tags chip (re-uses `TagPicker`), and Notes textarea (collapsed).
- Footer actions: "Save all" (calls `addTask` for each, `inbox: true`), "Save & process" (saves then opens `ProcessInboxDialog`), per-row delete, and "Discard all".
- If transcript yielded zero tasks, keep current fallback (drop transcript into draft for review) — no sheet.
- Apply the same sheet to text capture when the user presses a new "Edit details" affordance next to Capture (small chevron button) — opens the sheet pre-populated with the parsed values.

## 3. Combine Quick Capture Categories with Tags + usability

- Merge the two sections: remove the standalone "Quick Capture Categories" section and lift category chips into the Quick Capture card as a horizontally scrollable row directly under the input.
- Each chip now represents a **category-as-tag** behavior:
  - Tapping a category chip toggles it as the active `area` AND adds a matching lowercase tag (`#home`, `#family`, …) to the next capture. Multi-select allowed.
  - Selected chips show a check + colored ring; a small `×` clears all.
- Add a "More tags…" trigger at the end of the row that opens `TagPicker` (existing component) so the user can attach arbitrary tags without leaving the card.
- Show selected tags as removable chips just above the input so it's clear what will be attached.
- Usability tweaks:
  - Mobile: horizontal scroll for category chips with `no-scrollbar`, snap-x, larger 36px tap targets.
  - Capture button stays right-aligned; show an inline "Edit details" ghost button next to it (opens VoiceReviewSheet pre-populated with parsed draft).
  - Caregiver presets row now also pre-fills the draft *and* opens the review sheet on tap (instead of saving silently), so users can confirm/edit.
  - Keep `Manage Tags` link in the card header.

## Files

- Edit: `src/pages/Inbox.tsx` (gesture, merged categories+tags UI, sheet wiring)
- New: `src/components/inbox/VoiceReviewSheet.tsx` (editable confirm sheet)
- Reuse: `src/hooks/use-audio-recorder.ts`, `src/components/tags/TagPicker.tsx`, `src/lib/haptics.ts`, `src/components/ui/drawer.tsx`, `AREAS` from `@/lib/types`

## Out of scope

- No edge function or schema changes.
- No changes to ProcessInboxDialog internals (just invoked from the sheet's "Save & process").
- No changes to desktop FAB or Carey button.
