## Your question first: can Step 3 read/write real tasks?

Yes — safely, and I'd recommend a hybrid.

What I confirmed by reading the code:
- Tasks live in the global store (`src/lib/store.tsx`) with `addTask(partial)` / `updateTask(id, patch)` and are already backend-backed with partial-patch mapping.
- The `Task` model (`src/lib/types.ts`) already has everything Step 3 needs: `isTopThree`, `dueDate`, `startTime`/`endTime`, `estMinutes`, `dayPart`, `priority`, `energy`, `status`.
- Top-3 is already a real task concept: `pickTopThree()` and `TopPrioritiesCard.tsx` read/write `isTopThree` on real tasks for a given date. The planner timeline positions real tasks by `startTime`/`dayPart`.

So Step 3 does not need a parallel data model. Least-risky wiring:
- **Priorities → write to real tasks.** Selecting an existing task sets `isTopThree: true` + `dueDate = today`. Typing free text creates a real task via `addTask`. Removing a slot only clears `isTopThree` — never deletes.
- **Rhythm → keep AI blocks as check-in payload, add an optional `taskId` link.** Rhythm blocks are AI-authored time labels, not tasks; forcing each into a task would spam the task list. Linking writes `startTime` + `dueDate` onto the chosen task so it appears on the planner grid. Unlinking clears `startTime` only.
- Store selections in the existing `daily_checkins.ai_payload` JSON as additive optional fields — no migration needed.

Risk notes: new `CheckInAiPayload` fields must be optional; regeneration overwrites the payload, so user-chosen priorities survive because they live on tasks themselves.

## Part 1 — three fixes

1. **Moon phase contradiction** (`supabase/functions/ai-daily-checkin/index.ts`): add a hard system-prompt constraint — never name a moon phase other than the exact label provided; if no moon data is passed, omit phase names entirely. Redeploy the function.
2. **Step 3 layout** (`src/components/checkin/StepBuild.tsx`): remove `anchor.why` from the step subtitle; render it as muted helper text directly beneath the intention input.
3. **Greeting null-case** (`src/lib/greeting.ts` + `src/pages/DailyCheckIn.tsx`): `timeOfDayGreeting` returns "It's late" with no baked-in "friend". The page appends `, {name}` only when a real display name exists, else `, friend`. Since signup seeds `profiles.name` from the email local-part, treat a name matching the account's email local-part as unset.

## Part 2 — Step 3 becomes a real planning step

New shared control `src/components/checkin/TaskPicker.tsx`: a shadcn `Popover` + `Command` combobox that searches store tasks (undone, today or unscheduled/inbox, excluding subtasks) and also accepts free text ("Create '<typed text>'"). Returns `{ taskId }` or `{ text }`.

**Top 3 priorities**
- Three slots, each a `TaskPicker`. Pre-filled from the day's existing `isTopThree` tasks, falling back to the AI's suggested priority strings as one-tap accepts.
- Select existing → `updateTask(id, { isTopThree: true, dueDate: today })`. Type new → `addTask({ title, isTopThree: true, dueDate: today, priority: "high" })`. Clear slot → `updateTask(id, { isTopThree: false })`.
- Slots show live done-state from the store.

**Rhythm timeline**
- Each AI block keeps its time + label and gains a "link task" control (same `TaskPicker`).
- Linking → `updateTask(taskId, { dueDate: today, startTime: <block time as HH:MM> })` and stores `taskId` on the block. Linked blocks render the task title with a live completion checkbox.
- Free text in a rhythm slot creates a task at that time. Unlink clears `startTime` and the stored `taskId`.

**Intention** stays editable text defaulting to the AI suggestion, plus the relocated "why" copy.

### Technical details
- `CheckInAiPayload.method.rhythm.blocks[]` gains optional `taskId?: string | null`; `rhythm` gains optional `priorityTaskIds?: (string | null)[]` and `priorityTexts?: (string | null)[]`. All optional → backward compatible, no DB migration.
- Persistence via the existing `update({ ai_payload })` path in `useDailyCheckIn`.
- Time parsing: convert labels like `8:30a` to `HH:MM`; unparseable times keep the link but skip the `startTime` write.
- Stale ids: a linked task that no longer exists renders as plain text.

### Verification
Typecheck, then an authenticated browser walkthrough with screenshots of Step 3 showing a picked existing task, a newly typed priority, and a linked rhythm block — plus confirmation the moon phase text matches the header badge.