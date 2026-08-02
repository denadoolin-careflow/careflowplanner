# Notepad, Task Tray, and an Interactive Today/Planner Grid

A pass over the Today page and planner grid to make everything directly editable, plus a ClickUp-style floating notepad + task tray, header images, and a calmer atmosphere strip.

## 1. Notepad + Task Tray (ClickUp-style)

A single dockable widget pinned bottom-right on desktop, and a bottom sheet on mobile, available on every page.

- Collapsed: a small pill with two tabs — **Notepad** and **Tray**.
- **Notepad**: quick scratch notes that auto-save as you type. Each note can be converted into a task or saved into the Notes hub.
- **Tray**: a parking spot for tasks you're moving around. Drag any task row (planner grid, inbox, task lists) into the tray; drag it back out onto the grid to schedule. Also works as a quick-add target.
- Persists across pages and reloads.

## 2. Interactive, editable Today cards

Today dashboard cards (Anchor, Capacity, Plan, Care, Grow, Routines) get inline editing instead of read-only text:

- Click a task line to toggle done, rename inline, or open the full editor.
- An inline add row at the bottom of each list card.
- Editable card titles, reusing the existing EditableText pattern.
- Consistent hover and press affordances across all cards.

## 3. Header image on Today, Week, Month pages

- A header banner above the greeting: pick from curated Unsplash imagery, search Unsplash, or upload your own photo.
- Uploads go to a Cloud storage bucket; the choice is saved per user so it persists.
- Includes a remove-image option and a gradient scrim so the greeting text stays readable.

Note: the existing cover picker points at `source.unsplash.com`, which Unsplash has retired — this work replaces it with a working image source and shares the new picker with Notes covers.

## 4. Expanded, interactive time grid

- Taller grid rows and larger tap targets so blocks are easier to grab.
- Every task block on the grid gets a **checkbox** with a haptic buzz plus a scale/checkmark animation on completion and a settled strike-through.
- Drag to move, drag edges to resize duration, drop onto empty space to schedule — on mouse and touch.
- Schedule / Time of day / Morning / Afternoon / Evening views all get the same treatment: add a task inline inside a section, edit in place, and drag between sections (dropping into Afternoon reschedules the task's time accordingly).
- Scheduled and unscheduled lists share one row design and one alignment grid, so columns line up.

## 5. Mobile inbox scrolling

- The inbox/task-source rail above the grid becomes a properly bounded scroll area with momentum scrolling, sticky section headers, and no nested-scroll trapping while dragging.
- Auto-scroll when a dragged task approaches the top or bottom edge.

## 6. Simplified weather + moon

- Replace the current multi-chip atmosphere strip with one calm line: a single condition icon with high/low, and a small moon glyph. Cycle phase shows only as a subtle colored dot.
- Full detail (per-day-part weather, illumination, cycle day) moves into a tap-to-open popover.

## Technical notes

- New `src/components/tray/TrayDock.tsx` plus notepad/tray panels and a persisted tray store, mounted in the app shell.
- New shared `HeaderImagePicker` (Unsplash search + upload to a public storage bucket) replacing `CoverImagePicker`; new `header_image` field on the user profile.
- `PlannerTimeline.tsx`: raise row-height constants, give the block renderer a checkbox with `haptics` and a completion animation, extend resize handles to pointer events.
- `PlannerPeriodList.tsx` / `PlannerScheduleList.tsx`: inline quick-add, and each section becomes a drop target keyed to a default hour (reusing `partDropHour`).
- `PlannerTaskRow.tsx` becomes the single shared row for scheduled and unscheduled lists.
- `PlannerAtmosphereStrip.tsx` and `DayContextStrip.tsx` collapse to a compact summary plus detail popover.
- Storage bucket for uploads created via migration with public read and per-user write policies.