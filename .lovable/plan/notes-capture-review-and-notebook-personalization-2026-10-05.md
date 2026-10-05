# Notes capture review and notebook personalization

## What will change
- Simplify the inline capture prompt to “What’s on your mind?”
- Change the add action and Enter key from immediate saving to a review sheet. The review will clearly show whether the capture will become a new note, a task, or an addition to an existing note.
- Let the user edit the detected title/content before confirming. Task reviews will also expose the detected date, time, priority, tags, area, duration, and project where available; nothing is saved until confirmation.
- Add a small pinned-section size control with compact, comfortable, and roomy choices. The selected density will be remembered on the current device and will adjust cover height, preview lines, card width, and metadata without hiding note actions.
- Add a customize action to every monthly notebook. Users can set a custom title, choose an atmosphere-derived cover color, and select a seasonal icon; gallery cards and the opened month heading will use those choices.
- Keep notebook appearance preferences device-local and keyed by month, without changing note content or the existing synced note model.

## Technical details
- Refactor capture submission into preview data plus an explicit confirmation step, while retaining the existing NLP parser and current create/append/task save paths.
- Use the existing dialog, form, and semantic button components for the review and notebook customization controls.
- Store pinned density and month notebook metadata in versioned local preferences, following existing Notes presentation-preference patterns.
- Use semantic atmosphere colors and Lucide seasonal icons; no custom images or new database tables.

## Verification
- Confirm Enter and the add button open review without saving, edits are honored, cancellation preserves the original capture, and confirmation saves each destination correctly.
- Confirm the three pinned sizes remain readable and usable on phone and desktop, and persist after reload.
- Customize multiple months and confirm title, color, and icon remain distinct after reload and appear in both gallery and month detail.
- Check the Notes page for overflow, keyboard accessibility, runtime errors, and build errors.