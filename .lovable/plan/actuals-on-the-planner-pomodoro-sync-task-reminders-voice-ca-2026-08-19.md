# Actuals on the planner, Pomodoro sync, task reminders, voice capture for writing

Four connected additions, built on what already exists: the `task_time_entries` log and `/tracking` screen, the pomodoro store, the browser reminder scheduler in `src/lib/reminders.ts`, and the voice capture dialog that currently only produces tasks.

## 1. Actual time on the Capacity view and the timeline

Right now capacity and time review only know *planned* minutes (from the planner feed) and *completed* (a task being checked off). Actual tracked seconds live only in the tracking screen.

- Load tracked entries for the visible window and roll them up per task, per day, and per group (area, activity, person, zone, kind), so every capacity slice gains an "actual" number alongside planned.
- Capacity view: each bar gets a second, thinner "actual" bar overlaid on the planned bar, plus an over/under badge (e.g. `+35m over`, `-20m under`). Totals row shows planned / actual / delta for the window. The daily sparkline gains an "Actual" series.
- Timeline: task blocks that have tracked time show a small subtle progress fill against their allocated duration and a compact `1h10 / 45m` label; over-allocation tints the edge with the existing warning token. Hovering/tapping shows the breakdown.
- Time Review panel gets the same actual series so day/week/month reviews compare planned vs completed vs actual.
- Blocks with no tracked time look exactly as today — nothing new appears until you track.

## 2. Pomodoro ↔ time tracking sync

Today the pomodoro store and the time tracker are separate timers that can both run for the same task.

- One shared source of truth: starting a pomodoro focus session for a task also starts the tracker for that task; pausing/resuming/finishing a focus block pauses/resumes/stops the tracked segment. Break periods do not accrue tracked time.
- Starting the tracker from the planner or `/tracking` optionally starts a matching pomodoro session (setting, default on when the task has an allocation).
- Focus sessions already recorded in pomodoro history are matched to the tracked segment so a session is never double-counted.
- Both the tracking screen and the planner focus panel show the same elapsed value, and a running timer is visible from the planner (small running chip in the header, tap to open the focus panel).

## 3. Task due reminders with snooze and repeat

Extends the existing scheduler rather than adding a second one.

- Reminders for tasks with a due date (not just a start time), with per-task lead time chosen in the task editor: at time, 10m, 30m, 1h, 1 day.
- The alert appears as a toast plus a browser notification with actions: **Snooze** (5m / 15m / 1h / tomorrow morning), **Done**, and **Open**.
- Repeat: a task can repeat daily / weekdays / weekly / monthly; when completed the next occurrence is scheduled and its reminder set with it.
- Snoozes and fired state persist locally so a reload doesn't re-fire or lose a snooze.
- Settings gets a "Task reminders" section: enable/disable, default lead time, default snooze length, quiet hours.

## 4. Voice capture for notes and journal

The voice dialog currently transcribes and proposes tasks only.

- Add a destination selector to the capture dialog: **Tasks** (today's behaviour), **Note**, **Journal entry**.
- For note/journal, the transcript is cleaned into readable paragraphs with an AI-suggested title, then shown in an editable review step before saving to the notes or journal record for the chosen date.
- Optional "also extract tasks" checkbox so one recording can produce both a note and its action items.
- Entry points: the existing search/brain-dump path, a mic button in the notes and journal editors, and a mic action on the planner capture menu so a voice note can be created directly as a time block on the grid.

## Technical notes

- New `src/lib/planner/actuals.ts`: hooks that query `task_time_entries` for a date window and expose `byTask` / `byDay` / `byGroup` maps; consumed by `time-allocation.ts`, `PlannerCapacityView.tsx`, `PlannerTimeReview.tsx`, and `PlannerTimeline.tsx`.
- Pomodoro sync lives in a small bridge module that subscribes to `pomodoro-store` transitions and drives `timeTracker`, avoiding circular imports between the two stores.
- Reminders extend `src/lib/reminders.ts` (prefs, snooze map in localStorage, Notification actions) and the existing background service component; recurrence fields are stored on the task record.
- Voice destinations reuse `use-audio-recorder` and the `ai-voice-capture` edge function with a `mode` parameter for note/journal formatting.
- No schema changes for actuals or pomodoro; reminders/repeat and voice notes reuse existing task/note/journal tables, adding columns only if a recurrence field is missing.
