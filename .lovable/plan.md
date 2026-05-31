## Goal

Clean up the Calendar page on mobile so the date header, view toggles, layout toggles, and filter chips all line up on their own rows without overlapping.

## Problems visible in the screenshot

1. The date label ("May 31 – Jun 6, 2026") wraps to four short lines and sits visually behind the Day/Week/Month/Year + Grid/Schedule toggles because `SectionCard`'s header is a single horizontal row.
2. The view toggles and layout toggles squeeze into the right edge and clip "Schedule" off-screen.
3. The filter-chips row wraps to two lines and pushes the "All" reset link to a lonely right-aligned spot on the second row.

## Changes

### 1. `src/components/cards/SectionCard.tsx` — stack header on mobile

Switch the header layout so the action area drops under the title on narrow screens:

```diff
- <header className="flex items-start justify-between gap-3 px-5 pt-5">
+ <header className="flex flex-col items-start gap-2 px-5 pt-5 sm:flex-row sm:justify-between sm:gap-3">
    <div className="min-w-0">…title…</div>
-   {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
+   {action && <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">{action}</div>}
  </header>
```

This gives every SectionCard headroom on mobile and unblocks the calendar title from competing with its action pills.

### 2. `src/pages/CalendarPage.tsx` — title + toggles

- Wrap the title row with `flex-wrap` and force the date label onto a single line with `whitespace-nowrap text-base sm:text-lg`:
  ```diff
  - <div className="flex items-center gap-2">
  + <div className="flex flex-wrap items-center gap-2">
      …chevrons…
  -   <span>{headerLabel}</span>
  +   <span className="whitespace-nowrap text-base sm:text-lg">{headerLabel}</span>
      …Today…
  ```
- Make the toggle row a single horizontal scroller on mobile so Day/Week/Month/Year + Grid/Schedule/Kanban/Plan stay on one line and never clip:
  ```diff
  - <div className="flex flex-wrap items-center gap-2">
  + <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-auto sm:flex-wrap sm:overflow-visible">
  ```
  Both inner pill groups already use `shrink-0` via their button widths; add `shrink-0` to each `<div className="flex gap-1 rounded-full…">` wrapper so the rounded groups don't squish during scroll.

### 3. `src/pages/CalendarPage.tsx` — filter chips row

Convert the chip row into a horizontal scroll rail on mobile and integrate "All" as the first chip so it never floats alone:

```diff
- <div className="mb-3 flex flex-wrap gap-1.5">
+ <div className="mb-3 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 sm:flex-wrap sm:overflow-visible sm:pb-0">
+   <button
+     type="button"
+     onClick={() => setKindFilter(new Set(ALL_KINDS))}
+     className="shrink-0 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
+   >
+     All
+   </button>
    {([...]).map(...)}
-   <button … className="ml-auto …">All</button>
  </div>
```

Add `shrink-0` to each chip's className so they don't compress inside the scroller.

## Out of scope

- The week-view grid only fitting two day columns (separate calendar-grid responsiveness issue).
- Coloring/iconography of chips and toggles.
- Today button, chevrons, Google refresh banner.

## Verification

On the 411-wide mobile preview at `/calendar`:
1. Date label "May 31 – Jun 6, 2026" renders on a single line, followed by Today, with no overlap.
2. Day/Week/Month/Year and Grid/Schedule/Kanban toggles sit on their own row below the title; the row scrolls horizontally if it doesn't fit, with nothing clipped.
3. Filter chips (Tasks, Appointments, …, Google, plus "All") all live on one horizontally-scrollable row with a thin scrollbar; no orphaned second row.
4. Desktop layout (≥640px) is unchanged: title and actions still sit side-by-side and chips still wrap normally.
