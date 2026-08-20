# Toggle blocks: fix persistence, folding and Craft-style feedback

Toggles (collapsible blocks) in the notes editor are shared by the journal editor and the task detail editor — they all render `BlockEditor`, so one set of fixes covers all three surfaces.

## Issues found

1. **Toggles are destroyed on save.** Note bodies are stored as markdown. The HTML→markdown converter has custom rules for checkboxes, file embeds and entity chips, but none for `<details>`. Turndown flattens the toggle into its bare text, so on reload the toggle is gone and its hidden content is dumped inline. This is the main "toggle issue".
2. **Open/closed state isn't remembered.** Even where a toggle survives, the `open` state is not written back to the stored body.
3. **Collapsed bullets and collapsed headings are DOM-only.** Collapsing a nested bullet or a heading section just adds a CSS class to the live element. Any re-render, re-open or reload throws it away.
4. **Double haptic buzz on every toggle tap.** The global haptic installer already fires on `summary` elements, and the editor's click handler fires a second `tap` — toggles feel buzzier than the rest of the app. The bullet-collapse path calls the raw vibration API directly, bypassing the user's haptics-off preference.
5. **Expand/collapse all is unreliable.** It synthesises clicks on each summary and toggles CSS classes on lists rather than changing the document, so results don't persist and nested cases are missed.
6. **Small touch targets on mobile.** The chevron hit area is smaller than the ~44px comfortable minimum, and tapping toggle text collapses it, which makes editing a toggle title fiddly on phones.

## How Craft behaves (the model to copy)

- The chevron is the control: tapping the chevron folds; tapping the text places the caret so you can edit the title.
- Folding state is part of the document, so it survives closing, syncing and reopening.
- Expanding animates content in with a short spring-like easing; the chevron rotates on the same curve.
- Haptics are a single light impact — one tap per fold, slightly softer on collapse than expand, and never fired twice.
- Collapse/expand all is available and behaves as a document change, not a visual trick.

## Plan

**Persistence**
- Add a `details` serialization rule so toggles round-trip as an HTML block (`<details open>` + `<summary>` + inner HTML) inside the markdown body, and make the markdown→HTML path hydrate that block back into a TipTap toggle with its open state intact.
- Ensure the `open` attribute is committed to the document when a toggle is folded (not just to the DOM), so the saved body reflects what you see.
- Store collapsed-bullet and collapsed-heading state the same way — as an attribute on the node — so folded outlines and folded sections survive reload.

**Interaction**
- Restrict fold-on-click to the chevron zone; clicking the toggle title puts the caret in the title.
- Widen the chevron hit target on touch (≈44px) without changing how it looks.
- Rewrite "collapse all"/"expand all" as a single document transaction over all toggle and collapsible nodes instead of synthetic clicks.
- Keep the existing expand animation but apply the same easing to the chevron rotation.

**Haptics**
- Add explicit opt-out on the toggle summary so the global handler doesn't double-fire, and emit one deliberate pulse from the editor: a light tap on expand, a softer tick on collapse.
- Replace the raw vibration call in the bullet-collapse path with the shared haptics helper so the haptics preference is respected.

## Technical notes

- Files: `src/components/notes/BlockEditor.tsx` (turndown rules, `bodyToHtml`, toggle keymap, click handler, `setAllFolds`, toolbar), `src/index.css` (`.cf-toggle` summary hit area, chevron easing, collapsed-list styles), `src/lib/haptics.ts` (add a distinct soft collapse pulse if needed).
- The journal (`WriteBlockSheet`) and task detail (`TaskDetailPane`) editors need no changes — they consume `BlockEditor`.
- Existing notes whose toggles were already flattened cannot be recovered; the fix stops further loss from this point on.
