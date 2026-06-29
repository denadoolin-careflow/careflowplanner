# Craft-style Editor Polish

Goal: make the writing surface used by Notes, Tasks, and Journal feel as fluid as Craft Docs — softer typography, calmer motion, polished block affordances, a contextual selection toolbar, and an optional dim-other-blocks focus mode. All three surfaces share `src/components/notes/BlockEditor.tsx`, so the bulk of the work happens there once and benefits everywhere.

## What changes

### 1. Typography & rhythm
- Install and wire a Craft-like display + reading pair: `@fontsource-variable/fraunces` (display, for H1/H2) and `@fontsource-variable/inter` (body) via `bun add`, imported in `src/main.tsx`, exposed as Tailwind families `font-display` and `font-prose` (kept additive so existing atmospheres still win where set).
- New `.cf-editor-prose` class (scoped to BlockEditor wrapper) overrides the current Tailwind `prose` defaults:
  - Body line-height `1.7`, paragraph spacing tightened, max measure ~68ch.
  - H1 gets Fraunces 600, generous tracking, optical-sizing on; subtle 1px hairline underline.
  - Soft caret color (`hsl(var(--primary))`), thicker (`caret-width: 2px` via `caret-color` + `::selection` using `--primary / 0.18`).
  - Bullet/check markers softened with muted hue + consistent vertical rhythm.
  - List indent uses `padding-inline-start: 1.25rem` for predictable nesting.
- Code, blockquote, hr, and task list checkbox restyled to match atmosphere tokens (no hardcoded colors).

### 2. Smooth motion
- Replace abrupt slash menu / link menu open with `animate-scale-in` + 120 ms ease-out (`@/tailwind` already has `scale-in`).
- Bubble toolbar uses Tippy with `animation: "shift-away-subtle"` (already loaded) plus a CSS `will-change: transform` on the menu shell to avoid jank.
- Block insert / drag handle fade in via `transition-opacity duration-150` instead of instant toggle.
- Toolbar buttons get `transition-[background,transform] duration-150 active:scale-[0.96]` for soft tactile feel.
- Editor caret + selection respect `prefers-reduced-motion` (skip the scale-in keyframes).

### 3. Block UX (drag, hover, indent)
- `tiptap-extension-global-drag-handle` is already in use — restyle its handle/add button:
  - Round 22 px button, neutral icon, soft hover ring, only visible when hovering the block row (opacity 0 → 70).
  - Add a sibling “＋” button that opens the slash menu at that block via `editor.chain().focus().insertContent("/").run()`.
- Smoother indent/outdent: bind `Tab` / `Shift+Tab` at the editor level so they work in paragraphs (wrap into a bullet on first Tab inside a list-less paragraph, then sinkListItem after).
- Hovered block gets a faint left-edge marker (`border-l-2 border-primary/0` → `border-primary/40` on hover) for a Craft-like “block aware” feel.
- Nested toggles (`Details`) get smoother chevron rotation (`transition-transform duration-200`).

### 4. Floating bubble toolbar
- Replace the current always-mounted toolbar block (when there is a text selection) with TipTap’s `BubbleMenu` (already imported but unused for inline formatting):
  - Pill-shaped container, backdrop blur, atmosphere-tinted border.
  - Buttons: Bold, Italic, Underline, Strikethrough, Code, Link, Highlight (color popover), Heading toggle, Clear formatting.
  - Appears only on non-empty selection; hides for code blocks and image nodes (`shouldShow`).
  - Subtle arrow + 180 ms `scale-in + fade-in`.
- Existing top toolbar stays for structural blocks (headings, lists, quote, divider, fullscreen, focus toggle) but is visually slimmed: smaller icons, single row on desktop, horizontally scrollable on mobile, divider lines between groups.

### 5. Dim-focus mode (Craft “Focus”)
- New toolbar toggle `Focus` (eye icon) stored in `editor-prefs.ts` (`focusMode: boolean`).
- When on: add `.cf-focus` class on the editor wrapper; CSS dims every direct child of `.ProseMirror` to `opacity: 0.45` and re-fades the block containing the current selection to `opacity: 1` via a small TipTap plugin that adds `data-active="true"` on the focused top-level node (transaction-driven, no React re-render).
- Smooth `transition: opacity 200ms ease-out` so the dim feels gentle.
- Persists per-user via existing `useEditorPrefs` hook.

## Where the edits land

- `src/main.tsx` — font imports.
- `tailwind.config.ts` — register `display` (Fraunces) + `prose` (Inter) families; no token color changes.
- `src/lib/editor-prefs.ts` — add `focusMode` boolean with persistence.
- `src/components/notes/BlockEditor.tsx` — toolbar slim-down, bubble menu, focus-mode plugin + class, drag-handle restyle, slash-menu animation, `.cf-editor-prose` wrapper class, indent key bindings.
- `src/index.css` — add the `.cf-editor-prose` and `.cf-focus` rule blocks (semantic tokens only, light + dark friendly), plus styling for the drag handle / add button.
- No changes to Notes / Tasks / Journal page files needed — they already render `BlockEditor`, and the polish is inherited.

## Out of scope

- No new collaboration, no AI rewrite, no data-model changes.
- No removal of existing slash commands, @-mention picker, file embed, or markdown round-trip — those keep working unchanged.
- No edits to `src/integrations/supabase/client.ts` or other auto-generated files.

## Verification

- Build + targeted typecheck after edits.
- Manually check Notes page, Task editor notes panel, and Journal Flow: typography reads softly, bubble toolbar appears on selection, drag handle + “＋” feel responsive, focus mode dims correctly in light and dark atmospheres.
