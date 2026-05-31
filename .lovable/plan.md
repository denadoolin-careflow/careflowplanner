## Goal

1. Align the leading indicators on every task row (status dot, checkbox, area icon) so they sit on the same baseline as the title's first line, regardless of whether the title wraps.
2. Make the horizontal scrollbar under the Inbox tag-filter chip rail thin and visually separated, so it no longer overlaps the chips.

## Why

The mobile screenshot shows two issues:
- On rows like "Pack Aerie's bag" the green status dot, checkbox, and area icon are at three slightly different vertical positions because each uses a different `mt-*` (currently `mt-2`, `mt-1.5`, `mt-1`).
- The tag-filter row at the top uses a `scrollbar-none` class that isn't defined in the project, so the default 10px global scrollbar shows directly underneath the chips and visually touches them.

## Changes

### 1. `src/components/cards/TaskRow.tsx` — row indicator alignment

Inside `rowBody`'s `<RowShell>` children:

- **Status dot** (currently `mt-2 h-2 w-2`) → `mt-[7px]` so its center sits at ~11px (matches first-line center for `text-[15px] leading-snug`).
- **Checkbox** (currently `mt-1.5`) → `mt-[3px]` so the 16px control centers on ~11px.
- **Area icon container** (currently `mt-1 h-6 w-6`) → shrink to `h-5 w-5` and use `mt-[1px]` so the box centers on ~11px without overhanging the title line. Inner icon stays `h-3.5 w-3.5`.
- **Chevron** (when subtasks exist) — keep `mt-1.5` (already aligned with the new checkbox baseline since it's 20px tall ≈ line height).

These tweaks keep the indicators visually centered on the first text line when the title wraps to multiple lines (RowShell stays `items-start`).

### 2. `src/pages/Inbox.tsx` — slim tag-filter scrollbar

Replace the non-existent `scrollbar-none` class on the chip rail (line 224) with a thin, separated scrollbar:

```
className="flex items-center gap-1.5 overflow-x-auto pb-1.5
  [scrollbar-width:thin]
  [&::-webkit-scrollbar]:h-1
  [&::-webkit-scrollbar-track]:bg-transparent
  [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb]:bg-border/60"
```

This produces a 4px-tall thumb sitting in a 6px reserved track under the chips, so the chip outlines no longer touch the scrollbar. Firefox uses `scrollbar-width: thin` for the same effect.

## Out of scope

- No changes to swipe behavior, haptics, or chip styling/colors.
- No global scrollbar restyle (the rest of the app keeps the existing 10px scrollbar).

## Verification

On the 411-wide mobile preview at `/inbox`:
1. Each task row's green dot, checkbox, and area icon sit on the same horizontal line as the title's first character.
2. Multi-line task titles (e.g. the "Make sure that the events…" row) keep the indicators aligned to the first line, not vertically centered on the wrapped block.
3. The tag chip rail shows a thin scrollbar with a small gap beneath the chips; the chip borders no longer touch it.
