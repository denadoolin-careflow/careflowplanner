# Cleaner note section folding

## Goal
Make every heading act as a dependable section toggle: all content beneath it—including paragraphs, lists, tables, queries, embeds, and lower-level headings—hides until the next heading of the same or higher level. Remove the tiny dotted hover decoration from note text and toggles.

## Changes
- Keep heading hierarchy as the section boundary, so an H2 folds everything through the next H2/H1 while preserving nested H3–H6 content inside it.
- Make the heading gutter caret and the first content line beneath the heading operate the same fold, without interfering with text editing.
- Keep the existing smooth fold/unfold animation, sound, haptics, and persisted collapsed state.
- Remove the dotted block-drag handle appearance on hover throughout the note editor, including toggle blocks; retain a clean caret-only folding affordance.
- Keep touch targets large on mobile and ensure hidden content cannot receive focus or remain visually exposed.

## Verification
- Test sections containing plain text, nested bullets, tables, queries, toggles, and lower-level headings.
- Confirm each section stops folding at the next same-or-higher-level heading.
- Confirm collapsed sections restore after reload and the fold animation is visible in both directions.
- Confirm no tiny dotted controls appear while hovering text or toggles on desktop, and folding remains usable on mobile.
- Run the TypeScript check and inspect the selected note in the authenticated preview.
