# Planner interaction and readability refinement

## Goal
Make the Planner calmer and easier to operate on mobile and desktop: consistent view controls, compact routines, precise grid entry, richer day previews, unified day context, editable linked notes, and hourly Fahrenheit weather.

## Changes

### 1. Week-strip day preview
- Increase the hold duration so an ordinary tap or swipe does not accidentally open the preview.
- Replace the small task peek with a readable day-schedule preview ordered by time, including completion controls and an **Open day** action.
- Keep tap-to-jump, week swiping, and previous/next arrows unchanged.

### 2. Consistent Planner controls
- Restyle **Day / 3 Days / Week / Month / Year**, **Calendar / Overview**, **Grid / Schedule / Time of day / Capacity**, and **List / Table** with the same light pill treatment used on Today.
- Use the shared planning view-button pattern so active states, spacing, touch targets, focus states, and overflow behavior match across phone and desktop layouts.
- Keep every existing view and filter; this is a presentation and usability pass, not a navigation reduction.

### 3. Compact habits and routines
- Keep the existing per-day progress summary as the default collapsed state.
- Add a clear show/hide control for the single-day habits and routines card, matching the week row’s remembered density behavior.
- Preserve individual check-offs, routine step popovers, rest days, streaks, and Expand all / Collapse all.

### 4. Grid clarity and exact task creation
- Increase scheduled-task contrast and title/time legibility without making blocks visually heavier.
- Calculate a new task’s start from the exact pressed grid position, accounting for the live grid rectangle and zoom, then snap once to the existing 15-minute interval.
- Keep the selected time visibly anchored while typing and retain the existing start-time adjustment controls.
- Make outside click/tap dismiss an unfinished composer reliably, while interactions inside it remain usable; clear transient selection and focus styling after dismissal.
- Preserve drag-to-create, task movement, resizing, conflict handling, and mobile bottom-sheet entry.

### 5. One day-context card
- Combine Moon, solar season, cycle, and capacity into one compact **Day rhythm** card.
- Show a concise summary row first, with expandable sections for the existing detailed guidance, logging, suggestions, journal, and daily-note tools.
- Remove the four separate cards from the day page once their content is available through the unified card.

### 6. Editable “Referencing this day” notes
- Turn each linked note into an expandable row with an inline title/body editor and autosave.
- Reuse the existing note preview on pointer hover/focus, while tap/click expands the editor instead of immediately leaving the Planner.
- Keep an explicit action to open the full note. Journal references remain identifiable and editable through their existing journal update path.

### 7. Hourly Fahrenheit weather
- Show each available hour’s temperature in °F beside or below its weather icon in the day timeline gutter.
- Add the same icon-and-temperature treatment to the shared week/3-day time gutter where forecast data is available.
- Keep labels compact and readable at phone widths and retain condition tooltips and accessible labels.

## Technical details
- Reuse the existing Planner view preference stores and shared `ViewPills` visual pattern; no data migration is needed.
- Reuse existing local rhythm-density storage and synced habit/routine completion stores.
- Reuse current note and journal update functions with debounced saves.
- Consolidate existing Moon, season, cycle, and capacity components behind a composed Planner day-context component rather than duplicating their calculations.
- Keep all new presentation colors semantic and scoped to the established Soft Botanical Planner treatment.

## Verification
- Check phone-width and desktop Planner views for wrapping, overflow, touch target size, and active-state clarity.
- Verify tap, swipe, and the longer hold gesture on the weekly strip.
- Create tasks by tapping several quarter-hour positions and confirm saved times match the highlighted slots.
- Verify outside dismissal, drag/resizing, habit/routine expansion, inline note autosave, hover preview, and hourly °F labels.
- Run focused tests, type checks, and confirm the preview build is clean.
