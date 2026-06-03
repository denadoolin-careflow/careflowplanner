## Issues seen in the screenshots
1. **Desktop sidebar (image 1)** — collapsed rail is a flat, color-less stack of icons; no grouping, no active highlight, no atmosphere.
2. **Task settings (image 1)** — the opened task is a wall of plain rows (Date / Time / Repeat / Priority…) with no grouping, no color, and no visual rhythm — very different from the rich mobile sheet in image 2.
3. **Checkbox inconsistency** — the title-row "circle" on the opened task uses a custom `border-foreground/40` button while the rest of the app uses the green `Checkbox` (`h-5/6 w-5/6 rounded-full`).
4. **No completion feedback** — checking the box inside the opened task does nothing tactile/visual.

## Scope of fix (3 files, mostly `src/pages/TaskDetail.tsx`)

### 1. Visual sidebar refresh — `src/components/layout/Sidebar.tsx`
- **Collapsed rail (desktop+tablet)**: render each icon inside a 36×36 rounded chip. Active route gets `bg-primary-soft text-foreground shadow-soft`; hovered gets `bg-sidebar-accent`. Add 8px gap between LISTS / NAV_GROUPS / Areas with a 1px `border-sidebar-border/40` divider.
- **Expanded mode**: add tiny pastel dot next to each LISTS row tinted to that route's accent (Inbox=indigo, Today=amber, Upcoming=violet, Anytime=teal, Someday=slate, Logbook=stone). Reuse existing `cn` + semantic tokens — no new colors.
- **Mobile drawer**: same chip treatment so it doesn't feel like a different component.

### 2. Restyle TaskDetail (the "opened task" page used by `/tasks/:id`) — `src/pages/TaskDetail.tsx`
Replace the flat `SettingsRow` list with the same grouped **BigCard** grid used in `MobileTaskSheet.tsx` (project image 2). Cards stay clickable popovers/sheets — only the surface changes.

Layout (one component, responsive):
```text
PROJECT  | GOAL
─ Scheduling ─
DUE      | REPEAT
─ Organization ─
TAGS     | PRIORITY
─ Content ─
NOTES    | ATTACHMENTS
─ Utilities ─
TIMER  DUPLICATE  PIN
─ Danger zone ─
DELETE TASK
```

- Extract `BigCard`, `SmallTile`, `SectionLabel`, and `TONE_BG` into `src/components/tasks/TaskSettingsBits.tsx` so both `MobileTaskSheet` and `TaskDetail` import the same component (single source of truth).
- Responsive grid: `grid-cols-2` on mobile, `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` on desktop. Section labels and Danger Zone span full width.
- Keep existing Popover/Sheet pickers; just wrap each picker's trigger in a `BigCard`.
- Move Energy + Time-estimate chips into a single "Premium" `BigCard` cluster under Utilities (preserves existing behaviour).
- Keep CollapseCard for Notes / Attachments / Subtasks / Activity — only the settings block changes.

### 3. Consistent open-task checkbox
- Replace TaskDetail's custom title-row circle (`grid h-7 w-7 ... border-foreground/40` + manual `<Check>`) with the shared `<Checkbox checked={task.done} className="h-6 w-6 rounded-full border-2" />`. Same treatment used in `MobileTaskSheet` header — both surfaces now identical.
- Apply `line-through text-muted-foreground` to the title when `task.done`.

### 4. Haptic + gradient completion feedback (inside settings)
When the user checks the title checkbox in **TaskDetail** or **MobileTaskSheet** and the task transitions incomplete → complete:
- `haptics.success()` from `src/lib/haptics.ts` (already exists).
- Play a one-shot ~700 ms gradient sweep behind the title row: an absolutely-positioned overlay div with `bg-[linear-gradient(110deg,transparent,hsl(var(--primary)/0.35),hsl(var(--success,142_71%_45%)/0.5),transparent)]` animated `translate-x-[-120%] → translate-x-[120%]` via a new keyframe `task-complete-sweep` added to `tailwind.config.ts` (or inline `@keyframes` in `src/index.css`).
- A subtle ring pulse on the checkbox: scale `1 → 1.18 → 1` with `transition-transform`.
- Trigger via local state `justCompleted: boolean` set true on toggle, cleared via `setTimeout(700)`. No celebration on uncheck.
- Toast already exists in TaskDetail's bottom-bar "Complete" path; reuse it for the title-checkbox path too.

## Out of scope
- Subtask editor UI / Activity layout (unchanged)
- Goal model changes
- Project/area picker behaviour
- Confetti / sound — gradient sweep + haptic only