# Cleaner inline tags, richer query blocks, and smarter cleaning + grocery flows

Five related improvements across the notes editor, tag system, query embeds, cleaning tasks, and grocery lists.

## 1. Query settings + editable fields in tables and lists

- Give the note query embed a real settings popover instead of the bare dropdown: pick saved view or ad-hoc filters, choose which columns show, sort, result limit, and list/table layout — all stored on the block so each embed keeps its own setup.
- In table and list results, make field cells editable on click: select fields open a choice dropdown, dates open a calendar, checkboxes toggle, text/number edit inline (reusing the existing field cell control so behavior matches the planner table).
- Choosing an option writes straight to the item's field value and refreshes the live results.

## 2. Notes editor tagging behavior

- Fix the space-bar issue: typing a space after a tag ends the tag and types a plain space outside the highlighted chip (the link mark stops at the tag text).
- Drop the visible `@` / `#` prefix once a reference is inserted — the linked text renders as bold/highlighted text only.
- Hovering a linked tag/reference shows a small action popover with: edit tag settings, jump to tag, and remove link (keeps the words, drops the reference).

## 3. Date references render as preview cards

- `@today` / `@Aug 20` style references expand into a compact card showing the day's formatted preview: date heading, a few scheduled items, and any note/journal snippet, clickable to that planner day.

## 4. Cleaning tasks auto-detect zone

- Add keyword-to-zone inference (e.g. dishwasher/sink/fridge → Kitchen, laundry/washer → Laundry, shower/toilet → Bathroom, etc.) applied while typing a cleaning task, with the detected zone shown as an editable suggestion chip rather than a silent assignment.
- Same inference used when cleaning tasks are created from the planner and home reset flows.

## 5. Grocery lists, store links, and notes

- Grocery list rows and the list header get preferred-store links (per item and whole list) using the saved store preference, with a quick way to switch store.
- Grocery items surfaced on the planner and home reset gain the same store link and check-off behavior.
- Add a "grocery list" block for notes: insert a live grocery list into any note, check items off in place, and open the list in the preferred store from the block.
- Grocery inventory (pantry) stays the source for low-stock suggestions and feeds the note block's "add missing items" action.

## Technical notes

- Query block: extend `QueryBlockNode` attrs (columns, sort, limit) and add a settings popover; `SavedViewRunner` gains editable cells via the existing `FieldCell` component and `item_field_values` writes.
- Tagging: adjust the link-mark insertion in `BlockEditor` (inclusive: false, strip prefix in the inserted text) and extend `InlineTagPreviewLayer` with the edit/jump/remove actions.
- Date refs: new inline node view rendered from `@/lib/notes/date-refs` matches, pulling the day's tasks/notes from the store.
- Zones: new `src/lib/cleaning-zone-infer.ts` keyword map matched against the `cleaning_tasks.zone` values.
- Grocery: reuse `retailer-links.ts` + `useGroceryPrefs`; new `groceryListBlock` node for the editor backed by `grocery_lists`/`grocery_items`.
