# Add "Care" to Today's Quick-Add Bar

Add a fifth option — **Care** — to the kind picker in `src/components/today/QuickAddBar.tsx`, alongside Task / Home / Meal / Note. When chosen, it lets the user pick *who* the task is for and writes a Caregiving task linked to that person. If they don't pick, the bar auto-detects the person from the title (e.g. "Change Aerie's diaper" → Aerie).

## UX

Kind row (mobile-friendly, same pill style as today):
`Task · Home · Care · Meal · Note` — Care uses the `HeartHandshake` lucide icon.

When **Care** is selected, a compact person dropdown appears next to the input:
- Label: "For" with the selected person's name (or "Auto" when none picked).
- Options: "Auto-detect" + every entry in `state.recipients` (name + kind icon).
- Defaults to "Auto-detect".
- If there are zero recipients, the dropdown shows a single disabled "Add a person in Caregiving" item that links to `/caregiving`.

Input placeholder when Care is active: `"Add a care task… e.g. Change Aerie's diaper"`.

## Behavior

On submit when `kind === "care"`:
1. Resolve the recipient:
   - If user picked one → use that `recipientId` (and that recipient's name for the toast).
   - If "Auto-detect" → run `detectAreaAndProject({ title, recipients: state.recipients, areas: state.areas, projects: state.projects })` from `src/lib/task-auto-detect.ts`. Use the returned `recipientId` if any.
2. Call `addTask({ title, dueDate: iso, dayPart: SLOT_TO_DAYPART[resolvedSlot], area: "Caregiving", recipientId })`.
3. Toast: `Added care task for {name} → {DayPart}` — or `Added care task → {DayPart}` when no person was matched.

The existing slot picker (Auto / Morning / Afternoon / Evening) keeps working for Care just like it does for Task/Home.

## Technical notes

- File touched: `src/components/today/QuickAddBar.tsx` only.
- Extend `Kind` type to `"task" | "home" | "care" | "meal" | "note"`.
- Add `care` to the kind array + icon/label maps; reuse existing pill styling so layout doesn't regress on mobile.
- Add local state: `const [careRecipientId, setCareRecipientId] = useState<string | "auto">("auto")`.
- Reset `careRecipientId` to `"auto"` after submit (same place `setText("")` is called).
- Render the person dropdown only when `kind === "care"`, placed right after the input pill so it wraps cleanly on the 390px viewport.
- Use the existing shadcn `Select` (already used elsewhere, e.g. `TimeOfDayBoard.tsx`) to match styling.
- Import `detectAreaAndProject` from `@/lib/task-auto-detect` and `HeartHandshake` from `lucide-react`.
- `suggestedSlot` memo: include `"care"` in the same branch as `"task"` (don't filter by area), so history-based slot suggestion still works.

No backend, schema, or other component changes needed — `tasks.recipientId` and `area: "Caregiving"` already flow through the store and render in the existing care surfaces.
