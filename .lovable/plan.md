# Planner alignment, tray relocation, quick edit, image cropping, calm inbox

## 1. Snap scheduled tasks to the unscheduled row grid
Drag/resize on the timeline already snaps to 15-minute steps, but scheduled blocks and unscheduled task rows don't line up visually.

- Introduce a shared row metric (one 15-min slot = fixed px height) used by both timeline blocks and unscheduled/inbox rows, so a block's top edge always lands on the same baseline as a task row.
- While dragging, show a light alignment guide at the snapped target row and keep the ghost block's height in whole slot increments.
- Keep the existing haptic snap feedback on each slot change.

## 2. Move the tray into the quick-add button
- Remove the standalone floating "Notepad" pill.
- Add Notepad and Tray entries to the quick-add FAB menu; picking one opens the existing dock panel.
- The dock stays hidden until opened from the FAB, so it no longer floats over content.

## 3. Task quick edit
- Single tap/click on a planner block or task row opens a compact quick-edit popover (title, duration, due date, notes) instead of the full editor dialog.
- Keep an "Open full editor" link inside the popover.

## 4. Image crop controls
- Add a crop step to the header-image picker: after choosing a preset, upload, or URL, show the image in a crop frame with pan and zoom plus aspect presets (banner / square).
- Save the resulting crop (client-side canvas export) as the stored image.

## 5. Calming affirmation on mobile
- Show a rotating calming line at the top of the Inbox on mobile, drawn from the existing affirmation pools.
- Use a dedicated calm/decluttering pool for the Inbox so it reads differently from completion affirmations.
- Rotate per open with a soft fade, dismissible, hidden on desktop.

## Technical notes
- Timeline metrics live in `PlannerTimeline.tsx` (`HOUR_PX`, `SNAP_MIN`); extract them to a small shared module so rails and rows reuse the same slot height.
- Tray visibility is controlled by `src/lib/tray-store.ts`; `CombinedFab.tsx` gains the new menu actions and `TrayDock.tsx` loses its own launcher pill.
- Quick edit reuses `QuickTaskInlineEditor.tsx` inside a popover; `openTaskEditor` stays for the full dialog.
- Cropping is a new component used by `HeaderImagePicker.tsx`, exporting via canvas before `uploadHeaderImage`.
- Inbox affirmation extends `src/lib/affirmations.ts` with an inbox pool, rendered in `InboxOverview.tsx` behind `useIsMobile()`.