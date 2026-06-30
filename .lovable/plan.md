## Goal
Make text selection feel native on mobile in the BlockEditor (Notes / Tasks / Journal) with a deliberate swipe-to-select gesture + haptic feedback, and polish the new table formatting.

## 1. Swipe-to-select with haptics
File: `src/components/notes/BlockEditor.tsx` (+ small CSS in `src/index.css`)

- Add a `useSwipeSelection(editorRef)` effect that runs only on touch devices (`use-mobile`):
  - On `touchstart` over an editor text node, start a 220ms long-press timer. If the finger doesn't move >6px in that window, enter **selection mode**:
    - Trigger `haptics.tap()` (already in `src/lib/haptics.ts`).
    - Place an anchor caret at the touch point via `view.posAtCoords`.
    - Show a faint "Selecting…" hint pill that fades in (200ms) near the touch.
  - While in selection mode, every `touchmove` extends the ProseMirror selection from anchor → current `posAtCoords`, throttled with `requestAnimationFrame`. Re-fire a soft haptic tick each time the selection crosses a word boundary.
  - `touchend` exits selection mode with a gentle haptic confirm and lets the existing BubbleMenu appear over the selection.
  - Cancel cleanly on scroll, second finger, or if the user starts dragging the global drag handle.
- Selection visuals: add `.cf-selecting` class on the editor root during the gesture for a smooth `::selection` color transition and a subtle outline pulse on the anchor block.

## 2. Haptics wiring
- Reuse `src/lib/haptics.ts`. Use `tap` on entry, `tick` on word-boundary extension, `success` on commit. No new deps.

## 3. Table formatting polish
File: `src/index.css` (extend the table block added last turn) and `src/components/notes/BlockEditor.tsx`

- Refined visual rhythm: tighter cell padding (10px 12px), 13px font on mobile, sticky header row inside the scroll wrapper, alternating row tint that respects light/dark mode, rounded outer corners that don't clip inner borders.
- Better column resize affordance: visible drag handle on hover, wider 8px hit area, smooth width transition.
- Cell focus ring (`:focus-within`) replaces the heavy outline; selected cells get a soft primary tint with animated fade.
- Add a small overflow shadow on the horizontal scroll wrapper so wide tables hint at scrollability on mobile.
- Toolbar tweak: in the contextual table section of the BubbleMenu, group buttons with a divider and add "Add row above" + "Add column left" so the row/column controls are symmetrical.
- Slash menu: expand "Table" to also offer a quick "2×2" and "4×3" preset via secondary entries so mobile users skip the resize step.

## 4. Verification
- Typecheck after edits.
- Drive Playwright on `/notes/...` at the 804×712 mobile-ish viewport to:
  - Insert a table via the slash menu and screenshot the rendered grid (light + dark).
  - Simulate a touch long-press + drag across a paragraph and confirm a ProseMirror selection is created and the BubbleMenu appears.

## Out of scope
- No changes to storage/markdown round-tripping (already handled).
- No new dependencies.
