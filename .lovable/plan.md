## Sidebar header + Inbox controls polish

### 1. Sidebar brand block (fix overlap, new logo + tagline)
- File: `src/components/layout/Sidebar.tsx` (header at ~L776–L785) and a new `src/components/widgets/CareFlowMark.tsx`.
- Replace the heart-in-gradient chip with a new line-style SVG mark (`CareFlowMark`): crescent enclosing a small calendar grid with a heart inside, drawn with `stroke="currentColor"`, no fills, ~1.5 stroke width. Uses semantic tokens so it inherits atmosphere/light/dark colors.
- Brand text becomes:
  - Title: `CareFlow` (font-display, leading-none)
  - Tagline: `Care · Plan · Grow` (text-[10px] uppercase tracking-[0.18em] text-muted-foreground)
- Fix overlap with the 3 header buttons (theme/side/sections):
  - Wrap brand in `min-w-0 flex-1` with `truncate`.
  - When sidebar width < ~232px, hide the action row (CSS via `@container` or a `useEffect` width measurement against existing `width` state) so the brand never gets clipped.
  - Reduce icon button size to `h-6 w-6` and gap to `gap-0.5` when narrow.

### 2. Inbox-only header cleanup
- File: `src/components/layout/AppLayout.tsx`.
- Add `const onInbox = pathname === "/inbox"`.
- Conditionally hide on `/inbox`:
  - `<MobileSidebarTrigger />` (hamburger)
  - `<UniversalSearchBar />` (search)
  - `<ThemeToggle />` (day/night)
- All other pages unaffected. Mobile bottom-sheet inbox header (in `Inbox.tsx`) is untouched per scope.

### 3. Dropdown picker icons on Inbox controls
- File: `src/components/tasks/TaskListControls.tsx` (the Group/Filter/Sort menus rendered in Inbox header).
- Add Lucide icons next to each `DropdownMenuItem`:
  - Group: `Layers`, `Folder`, `Flag`, `CalendarDays`, `Tag`, `Slash` (none)
  - Filter: `Filter`, `Star`, `Tag`, `Flag`, `CircleDot`
  - Sort: `ArrowUpAZ`, `Calendar`, `Flag`, `Clock`, with direction arrow
- Icons sized `h-3.5 w-3.5 text-muted-foreground`, leading the label. Trigger buttons already show their lead icon; ensure the visible value (e.g. "Group: None") also includes its current icon.

### 4. Recent (top-5) tags in pickers
- New helper in `src/lib/tags.ts`: `getTopTags(tags, tasks, notes, n=5)` — counts tag references across `tasks[].tags` and `notes` body/tags; returns the top N by usage, falling back to most-recent `createdAt` ties.
- File: `src/components/tags/TagPicker.tsx` — when the popover opens with an empty query, render a "Recent" section above the full list showing those top 5 (with `tagIconFor` icon, count badge muted). Selecting one behaves like the existing tag click.
- File: `src/components/search/UniversalSearchBar.tsx` — in the empty-query state of the search results dropdown, add a "Recent tags" row of up to 5 chips; each navigates to `/tags/<name>` like the existing tag results.

### Technical notes
- New `CareFlowMark` uses only `stroke="currentColor"` and `fill="none"` so it inherits `text-sidebar-foreground`/atmosphere tints automatically.
- Width-aware hiding in the sidebar uses the existing measured `width` state already in `Sidebar.tsx` (no new listeners).
- No backend / store schema changes. `getTopTags` is a pure derivation memoized with `useMemo` at call sites.
- All icons from `lucide-react`; no new dependencies.