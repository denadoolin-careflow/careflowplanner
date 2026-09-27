# Morning Reset, Evening Reflection, and reliable note folding

## Goal
Turn the existing daily check-in and Exhale experiences into two clearly named rituals on Today, and make note headings reliably hide every subordinate block beneath them.

## Daily rituals

### Morning Reset
- Rename the current “Morning check-in” entry point and flow to **Morning Reset** while keeping its saved daily record, weather/moon context, mood, intention, top-three priorities, and planner-linked time blocks.
- Present it prominently in Today’s arrival area with clear states for **Start**, **Continue**, and **Completed today** rather than hiding the entry point after completion.
- Refine the four steps around the reset rhythm: arrive, notice, shape the day, and close—keeping existing AI guidance optional and preserving the local fallback/error state.
- Keep completion synchronized with Today’s intention and top priorities so the ritual immediately affects the working plan.

### Evening Reflection
- Rename and consolidate the existing Exhale flow as **Evening Reflection**, reusing its reflection, gratitude, release, unfinished-task carry-over, and tomorrow-anchor behavior rather than creating a duplicate workflow.
- Add a visible Today entry card that summarizes today’s completion and unfinished work, opens the ritual, and shows a completed state after saving.
- Save the reflection as the existing dated journal entry, move only selected unfinished tasks to tomorrow, and create up to three selected tomorrow anchors.
- Replace remaining user-facing “Exhale” and generic “Daily debrief / Reflect and reset” labels where they refer to this ritual, while keeping the separate AI plan analysis available as supporting insight.

## Note folding fix
- Replace DOM-only sibling assumptions with one shared heading-section resolver based on document order and heading level.
- A folded heading will hide every following block—including paragraphs, nested lists and their indented children, checklists, tables, embeds, toggles, and lower-level headings—until the next heading of the same or higher level.
- Use the same resolver for single-heading toggles, expand/collapse all, editor updates, silent content reloads, and saved-state restoration so behavior cannot diverge.
- Keep the current persisted fold attribute, animation, sound, haptics, editable heading text, and touch-sized gutter control.
- Ensure hidden descendants cannot be focused or exposed, and keep nested bullet/toggle folding independent from heading folding.

## Technical details
- Reuse `daily_checkins` and the existing daily intention/task stores for Morning Reset; no new database table is required.
- Reuse the existing dated journal and task-update paths for Evening Reflection, adding a lightweight per-date completion marker to its saved ritual data so Today can display completion consistently across sessions.
- Update the Today page and shared planning labels without changing unrelated planner layouts.
- Refactor the fold logic in `BlockEditor` into one section-boundary helper and keep the existing heading `data-collapsed` serialization.

## Verification
- Complete Morning Reset and confirm intention, priorities, linked schedule blocks, resume state, and completion state appear correctly on Today after reload.
- Complete Evening Reflection with selected carry-over tasks and anchors; confirm the journal entry, tomorrow’s tasks, and completed state after reload.
- Verify both rituals on desktop and mobile, including dismissal/re-entry and offline/AI-failure behavior.
- Test folded H1/H2/H3 sections containing nested indents, lists, checklists, tables, embeds, and toggles; verify unfolding restores everything and the next peer/ancestor heading remains visible.
- Verify collapse all/expand all, reload persistence, keyboard focus safety, TypeScript checks, and the live authenticated preview.
