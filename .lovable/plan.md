# Today header, rituals weather, My Focus, Inbox capture, month mockups

## 1. Today moon header
- The header follows the day you pick with the back/forward arrows instead of always showing today.
- The moon emoji animates when you change days: it slides and fades in the direction you moved and changes to that date's moon phase. If your device is set to reduce motion, it only fades.
- The highlighted phase (Plan, Grow, Care, Let go) and the moon sign match the selected date.
- Tapping any phase label opens a short guide to planning in that phase: what it's for, 3 example actions, what to avoid, and a link to the Moon & Rituals page.
- The clock gets a larger, bolder display of the current time with a soft pulse on the colon. On past or future days it reads "Viewing [date] · now 2:07 PM".

## 2. Weather in the rituals
- Morning Reset shows the morning weather: temperature, conditions and rain chance.
- Evening Reflection shows the evening weather for the same date.
- Both reuse the morning and evening weather already shown on Today. They show nothing when weather isn't available.

## 3. Typing in My Focus
- Each My Focus column header gets an "Add task…" line. Type, press Enter, and the task is created and pinned under that header. Dates and other quick details work as they do in other quick-add boxes.
- Tasks still stay in their original project or area.

## 4. Inbox capture
- The Inbox capture box will match the Notes "What's on your mind" box: the same rounded box that grows as you type, wrapped text, and no cut-off words on phone or tablet. The box stays visible above the on-screen keyboard and bottom bar.
- A "Save to" picker beside Save offers: Inbox (default), Today's notebook, or any note (searchable). Text is added to the end of the chosen note, with a link to open it.

## 5. Month view on mobile: design options first
- I'll make 3 preview mockups for a simpler phone month view, for example:
  - A. Clean grid: dots only, tap a day for a list below
  - B. Agenda list: weeks stacked, showing only days that have items
  - C. Compact week strip plus a mini month
- You pick one before I change the real month view.

## Technical details
- `TodayMoonHeader` takes the selected date from Today's date state and uses `useDayContext(date)`. Framer-motion `AnimatePresence` is keyed by date, and its direction comes from the date difference.
- The phase guide is a Popover (Sheet on mobile) with static copy in `lunar-rhythm.ts`.
- `DailyRituals` reuses `SlotWeather` (morning/evening) for the selected date.
- `FocusPinboard`: an inline input per column calls `addTask` with the NLP parse, then adds the new id to that column's local pins.
- Inbox: reuse or extract `NotesCaptureBox` styling (auto-grow textarea, `visualViewport` keyboard offset). A destination picker appends via the existing append-to-note helper or the daily note helper.
- The mockups live on a temporary preview route that is removed after you choose.
- No database changes.
