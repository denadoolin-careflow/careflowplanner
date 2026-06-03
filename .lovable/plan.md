## CareFlow Mobile Task Experience Redesign

Bring the Inbox and Task Editor in line with the screenshots: cream background, sage accents, soft 20–24px rounded cards, large readable type, big touch targets, calm spacing. Things 3 / TickTick / Craft feel without disrupting desktop or other planning pages.

### Scope (mobile-first, responsive on desktop)
- **Inbox page** redesign
- **New full-screen Task Detail route** for mobile (`/tasks/:id`) — replaces the modal on small screens, modal stays on desktop
- Reuse existing data + store, no schema changes

### 1. Inbox (`src/pages/Inbox.tsx`)
Simplified mobile layout:
- Header: hamburger · "Inbox" · search · theme toggle (no large icon tile)
- **Quick Capture Card** (`MobileCaptureCard`): big input "Capture anything…", below it three pill buttons (Date, Project, Area) + sage Add button; "More" reveals priority/tags/notes
- **Filter chip row**: All · Today · Upcoming · Scheduled · Overdue — horizontally scrollable, sticky
- **Tag library**: collapsed by default, header "Tags (12) ▾"
- **Task cards** (`MobileTaskCard`): checkbox · title · meta line (project · due · priority dots); swipe left = complete, swipe right = edit/delete (use existing swipe util if any, else simple touch handlers)
- Bottom tab bar already exists via AppLayout — leave as-is

Desktop (≥sm) keeps current rich controls (Group/Filter/Sort, detail pane, etc.).

### 2. Task Detail screen (`src/pages/TaskDetail.tsx` — new)
Full-screen route, mobile-first:
- **Header**: back · checkbox · ⋯ menu; title large; chips row (Project · Due · Priority)
- **Settings card**: Date, Time, Repeat, Priority (dots), Tags, Area, Project, List — rows with sage icon tile + label + value + chevron
- **Notes** card: collapsible; expanded if notes exist; rich-ish textarea with autosave + "Last edited" timestamp
- **Attachments** card: collapsible, reuses `AttachmentsField`
- **Subtasks** card: collapsible, progress "X/Y Complete", reorder + due/priority
- **Activity timeline**: collapsible (created / due changes / completed / notes updates) — derive from existing task fields
- **Premium CareFlow extras** (toggleable, persisted):
  - Caregiver Notes (private) — separate text field stored on task
  - Energy Level chips (Low/Med/High) — reuses `task-energy.ts`
  - Time Estimate chips (5m/15m/30m/1h/Custom)
  - Moon Phase chip (only when astrology pref on) — shows phase for due date
  - Voice Capture button (reuses `VoiceCaptureDialog`)
- **Sticky bottom bar**: Save Changes · Start Focus · Complete

Route added in `App.tsx`. `TaskRow` / open-task-editor hook routes to `/tasks/:id` on mobile (`useIsMobile`) and opens existing dialog on desktop, so other pages (Today, Week, Calendar, etc.) keep working.

### 3. Design tokens
- Use existing semantic tokens. Background uses `--background` (already cream-ish). Sage accent = existing `--primary`. Add a small set of utility classes in `index.css` for `.cf-card` (24px radius, soft shadow) and `.cf-icon-tile` (sage soft tile) used by the new screens only.

### Files
**Create**
- `src/components/tasks/mobile/MobileCaptureCard.tsx`
- `src/components/tasks/mobile/MobileFilterChips.tsx`
- `src/components/tasks/mobile/MobileTaskCard.tsx`
- `src/components/tasks/mobile/TaskDetailHeader.tsx`
- `src/components/tasks/mobile/TaskSettingsCard.tsx`
- `src/components/tasks/mobile/TaskNotesCard.tsx`
- `src/components/tasks/mobile/TaskSubtasksCard.tsx`
- `src/components/tasks/mobile/TaskAttachmentsCard.tsx`
- `src/components/tasks/mobile/TaskActivityCard.tsx`
- `src/components/tasks/mobile/TaskStickyBar.tsx`
- `src/pages/TaskDetail.tsx`

**Edit**
- `src/pages/Inbox.tsx` — mobile branch using new components
- `src/App.tsx` — add `/tasks/:id` route
- `src/lib/open-task-editor.ts` — on mobile, navigate to route instead of dispatching event
- `src/components/cards/TaskRow.tsx` — mobile uses MobileTaskCard
- `src/index.css` — add `.cf-card`, `.cf-icon-tile` helpers

### Non-goals
- No DB migration, no auth change, no edits to Today/Week/Calendar/etc.
- Desktop Inbox and existing `TaskEditor` dialog preserved.
- No new external dependencies.
