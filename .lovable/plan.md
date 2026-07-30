## Your question first: can Step 3 read/write real tasks?

Yes — safely, and I'd recommend a hybrid.

What I confirmed by reading the code:
- Tasks live in the global store (`src/lib/store.tsx`) with `addTask(partial)` / `updateTask(id, patch)` and are already Supabase-backed with partial-patch mapping (the fix from the planner work).
- The `Task` model (`src/lib/types.ts`) already has everything Step 3 needs: `isTopThree`, `dueDate`, `startTime`/`endTime`, `estMinutes`, `dayPart`, `priority`, `energy`, `status`.
- Top-3 is already a real task concept: `pickTopThree()` and `TopPrioritiesCard.tsx` read/write `isTopThree` on real tasks for a given date. The planner timeline positions real tasks by `startTime`/`dayPart`.

So Step 3 does not need a parallel data model. Least-risky wiring:
- **Priorities → write to real tasks.** Selecting an existing task sets `isTopThree: true` + `dueDate = today`. Typing free text creates a real task via `addTask` (same shape `TopPrioritiesCard` already uses). Removing a slot only clears `isTopThree` — never deletes.
- **Rhythm → keep AI blocks as check-in payload, add an optional `taskId` link.** Rhythm blocks are AI-authored time labels, not tasks; forcing every block to become a task would spam the task list. Instead each block gets an optional linked task; linking writes `startTime` + `dueDate` onto that task so it appears on the planner grid. Unlinking clears `startTime` only.
- Store the check-in-side selections in the existing `daily_checkins.ai_payload` JSON (additive optional fields) — no migration needed, and older payloads keep rendering.

Risk notes: `ai_payload` is typed `CheckInAiPayload`; new fields must be optional. Regenerate overwrites the payload, so user-chosen priorities/links must be re-merged after regeneration (I'll preserve them since priorities live on tasks anyway).

## Part 1 — three fixes

1. **Moon phase contradiction** (`supabase/functions/ai-daily-checkin/index.ts`): add a hard system-prompt constraint — never name a moon phase other than the exact label provided; if no moon data is passed, omit phase names entirely. Redeploy the function.
2. **Step 3 layout** (`src/components/checkin/StepBuild.tsx`): remove `anchor.why` from the step subtitle; render it as muted helper text directly beneath the intention input.
3. **Greeting null-case** (`src/lib/greeting.ts` + `src/pages/DailyCheckIn.tsx`): `timeOfDayGreeting` returns "It's late" (no baked-in "friend"). The page appends `, {name}` when a real display name exists, else `, friend`. Because the signup trigger seeds `profiles.name` from the email local-part, I'll treat a name that matches the account's email local-part as "unset" so those users get "friend" rather than a raw identifier.

## Part 2 — Step 3 becomes a real planning step

New shared control `src/components/checkin/TaskPicker.tsx`: a shadcn `Popover` + `Command` combobox that searches the store's tasks (undone, today or unscheduled/inbox, excluding subtasks) and also accepts free text ("Create '<typed text>'"). Returns `{ taskId }` or `{ text }`.

**Top 3 priorities**
- Three slots, each a `TaskPicker`. Pre-filled from the day's existing `isTopThree` tasks first, falling back to the AI's suggested priority strings as placeholders/one-tap accepts.
- Select existing task → `updateTask(id, { isTopThree: true, dueDate: today })`. Type new → `addTask({ title, isTopThree: true, dueDate: today, priority: "high", area: "Personal" })`. Clear slot → `updateTask(id, { isTopThree: false })`.
- Slots show live done-state from the store, so completing elsewhere reflects here.

**Rhythm timeline**
- Each AI block keeps its time + label, and gains a small "link task" control (same `TaskPicker`).
- Linking → `updateTask(taskId, { dueDate: today, startTime: <block time parsed to HH:MM> })` and stores `taskId` on the block in `ai_payload`. Linked blocks render the task title with a live completion checkbox.
- Free-text in a rhythm slot creates a task at that time instead.
- Unlink clears `startTime` and the stored `taskId`.

**Intention** stays editable text defaulting to the AI suggestion (unchanged behaviour, plus the relocated "why" copy).

### Technical details
- `CheckInAiPayload.method.rhythm.blocks[]` gains optional `taskId?: string`; `method.rhythm` gains optional `priorityTaskIds?: (string | null)[]`. Both optional → backward compatible, no DB migration.
- Persistence via the existing `update({ ai_payload })` path in `useDailyCheckIn`.
- Time parsing: convert AI labels like `8:30a` to `HH:MM` for `startTime`; blocks with unparseable times keep the link but skip the `startTime` write.
- Guard against stale ids: any linked task that no longer exists renders as plain text.

### Verification
Typecheck, then an authenticated browser walkthrough with screenshots of Step 3 showing a picked existing task, a newly typed priority, and a linked rhythm block — plus a confirmation the moon phase text matches the header badge.
