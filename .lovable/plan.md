Inbox page: full-page improvement mockup

Add a new tab, **5 · Full page**, to the /inbox-mockups preview. It shows the whole improved Inbox page at phone and desktop size, using sample items only. Your real Inbox stays the same until you pick what to build.

## What the improved page shows (top to bottom)

1. **Slim header**: "Inbox", a short count line ("5 things held gently"), and one "⋯" menu for extra tools: Process with AI, row style, the schedule pane and today's note pane.
2. **One capture box**: type or tap the mic. Smart typing hints ("Tomorrow 3pm · Home") show under the box as you type. The "Save to" choice is a small chip inside the box.
3. **Four sort boxes**: Today, This week, Someday and Notes, as soft-tint tiles with counts. Tap a tile to see what's in it.
4. **One filter row**: All · Quick wins · Needs a date · Needs a category. It replaces the current bucket headings and stats line.
5. **The list**: plain rows with a check circle, a title that wraps, one hint line (date or tag), and a single Sort button. The "Add to today's note" button moves into the Sort menu. Rows are grouped "New today" and "Earlier".
6. **"Sort one at a time"**: a button under the list that opens the focus card with the four boxes plus Skip.
7. **Desktop**: list on the left. On the right: the sort boxes plus a schedule pane you can switch to today's note.
8. **Empty state**: only the quiet line "Inbox zero, gently held."

## Style
- The rounded CareFlow card style, soft-tint phase icons, and nothing under 12px.
- Every tap target is at least 44px.

## Technical details
- Edit only `src/pages/InboxMockups.tsx`. Add a `FullPage` concept that reuses the existing `Capture`, `Row`, `SortSheet` and `Tint` helpers and the sample data, with page-only state.
- Make it the default tab.
- Check it in the browser at 390px and 1280px.
