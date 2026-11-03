# Refined Inbox mockup

A preview page at **/inbox-mockups** (sample items only — your real Inbox is untouched) showing three simpler Inbox designs, each at phone and desktop size, in the CareFlow card style and soft tint phase icons.

## Shared simplifications (all three)
- One capture box at the top: type or tap the mic; smart typing shows "Tomorrow · Care" as a small hint below, not inline clutter.
- One list of unsorted items; each row = check circle, wrapped title, one small hint (when / where it goes).
- One "Sort" action per item (Today, Pick a day, Move to note, Delete) instead of many buttons.
- Extra tools (view mode, row style, Plan my day, notebook pane) tucked into a single "More" menu.
- Quiet "Inbox zero, gently held." line when empty — no panel or illustration.

## Concepts
1. **Calm List** — capture box, then one stacked list grouped "New today" / "Earlier". Swipe right = Today, swipe left = Sort sheet.
2. **One at a time** — a focus card shows a single item with four big buttons (Today · Later · Note · Let go), with "3 of 12" progress; list available below.
3. **Sort Buckets** — list on top, four soft-tint drop zones (Today, This week, Someday, Notes) at the bottom on phone / right side on desktop; tap item then a bucket.

## Technical
- New `src/pages/InboxMockups.tsx`, public route in `App.tsx` next to other mockup routes; page-state only, reuses `.planner-card`, rhythm tokens and `PhaseIcon`.
- Check at 390px and 1280px. After you pick, the chosen design is built into the real Inbox and the mockup page removed.
