# Planner: UX, UI and feature improvements

A prioritized set of improvements. Pick the tiers or individual items you want and I'll build them.

## Tier 1 — Highest impact, low risk

1. **Now-first day view.** When the range is Day and the date is today, open scrolled to the current hour with a persistent "Now" pill that jumps back after scrolling away. Today the timeline scroll position resets on every re-render.
2. **Drag feedback that explains itself.** While dragging a task, show a floating chip with the target time and resulting duration ("2:15–3:00 · 45m") and highlight the destination slot. Right now the drop target is implied only by position.
3. **Undo toast on every schedule mutation.** The planner history exists but is invisible. Every drag, auto-schedule, snooze and bulk overdue action should raise a toast with an Undo button wired to the existing history stack.
4. **Empty-state and loading skeletons per view.** Week/Month currently render an empty grid while data resolves. Add skeleton chips and a single friendly empty state with the two primary actions (Plan my day, Pull from tray).
5. **Consistent chip density.** Day chips, week board cards and month chips use three different paddings and font sizes. Standardize on one chip component with `sm`/`md` densities so the whole planner reads as one system.

## Tier 2 — Meaningful new function

6. **Time-block templates applied by drag.** Templates exist as a menu; also let a template be dragged onto a day (week/month) to stamp its blocks onto that date.
7. **Multi-select and batch move.** Shift-click or long-press to select several items, then move, reschedule, complete, or tag them at once.
8. **Smart gaps.** Show subtle "free 45m" markers between blocks with a one-tap "fill with…" that suggests unscheduled tasks matching that duration and energy level.
9. **Recurring block awareness.** Show a small repeat badge and, on edit, ask "this occurrence or all future" instead of silently editing one.
10. **Week heatmap strip.** A thin capacity bar above the week grid showing load per day so overloaded days are visible before opening them.
11. **Print / share day sheet.** A clean printable day or week agenda — genuinely useful for caregiving handoffs.

## Tier 3 — Design polish

12. **Reduce simultaneous chrome.** The planner header can show range tabs, view tabs, kind filter, templates, tray, shortcuts and settings at once. Group secondary controls behind a single settings popover, keep only Range · View · Today · Capture in the bar.
13. **Category color system.** Area tints are hardcoded per component (`AREA_TINTS` in `PlannerTaskRow`). Move to semantic tokens in the design system so areas theme correctly in dark mode and can be user-customized.
14. **Quieter completed items.** Completed blocks should collapse to a slim strikethrough line rather than a full-height card, reclaiming grid space as the day progresses.
15. **Motion pass.** Subtle spring on drop, cross-fade on range change, and a checkbox fill animation shared across every planner surface.

## Tier 4 — Accessibility and reliability

16. **Keyboard scheduling.** Focus a task, press `s` to enter scheduling mode, arrow keys move by 15m, Enter commits. Full parity with drag for keyboard and screen-reader users.
17. **ARIA grid semantics.** Timeline and week grid should expose `role="grid"` with row/column headers and live-region announcements for moves.
18. **Reduced-motion and touch targets.** Respect `prefers-reduced-motion`; ensure all planner controls meet a 44px touch target on mobile.
19. **Offline-safe writes.** Queue planner mutations while offline and reconcile on reconnect, so a dropped connection during planning doesn't silently lose a reschedule.

## Notes

- Items 1-5 are mostly presentation changes in existing planner components; no schema changes.
- Items 6-11 need small additions: a template drag payload, a selection store slice, and a gap calculator over the existing feed.
- Item 13 touches `index.css` tokens and the area config; it's a global change worth doing before further color work.
