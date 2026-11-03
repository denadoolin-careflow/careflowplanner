# Combined Inbox mockup (all 3 in one)

Add a fourth design, **4 · Combined**, to the /inbox-mockups preview page. It uses sample items only, so the real Inbox stays the same.

## How it works (one page, three ideas)
1. **Top: the four sort boxes** (from Sort Buckets): Today, This week, Someday, Notes. They're shown as small tinted tiles with counts. Tapping a tile shows what's already sorted into it.
2. **Capture box**: one field to type in or tap the mic, same as now.
3. **The list** (from Calm List): plain rows split into "New today" and "Earlier". Long titles wrap, and each row has a soft phase icon, a check circle and one **Sort** button with the same four choices.
4. **"Sort one at a time" button** (from One at a time): opens a focused card for the oldest unsorted item, with large buttons for the four boxes plus Skip. A progress line shows "2 of 5". When the list is empty you see the quiet "Inbox zero, gently held." line.
5. Sorting an item from the list or from the focused card moves it out of the list and adds 1 to its box's count right away.

Extra tools stay under the single "⋯" button. On a phone everything stacks in one column. On desktop the list sits on the left and the boxes on the right.

## Technical
- Edit only `src/pages/InboxMockups.tsx`. Add a `Combined` component that reuses the existing `Capture`, `Header`, `Row`, `SortSheet`, `Tint` and sample data, with shared page state for items and bucket counts. Add it to the concept switcher and make it the default tab.
- Check it in the browser at 390px and 1280px.
