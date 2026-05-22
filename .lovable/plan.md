# Plan — Mobile auth, mobile UX, editable nav, project upgrades

This is a large request. I'll group it into 5 focused workstreams so each is shippable on its own. Tell me to drop or reorder any of them.

## 1. Mobile login (Google + email)

- Audit `src/pages/Auth.tsx` and the Lovable OAuth flow for mobile-specific failures (popup blocking, in‑app browsers, redirect handling, `/~oauth` route).
- Make sure `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` is used (already is) and that the redirect lands cleanly on mobile Safari/Chrome in‑app browsers.
- Add a visible error toast with the real error message instead of a generic one so we can see what's actually failing on the user's device.
- Add an "Open in browser" hint when we detect an in‑app webview (Instagram/Facebook/TikTok browsers block Google OAuth — this is the most common mobile login failure).
- Confirm there's no PWA service worker swallowing `/~oauth`. If a service worker exists, add `navigateFallbackDenylist: [/^\/~oauth/]`.
- Email/password: make the form keyboard-friendly (correct `inputMode`, `autoComplete`, larger tap targets, no zoom on focus).

## 2. Mobile optimization + haptics

- Sweep the most-used mobile screens (Today, Calendar, Inbox, Home, Meals, Notes) for: tap target sizes ≥ 44px, safe‑area padding, overflow-x bugs, text truncation, sticky header behavior.
- Wire `haptics.tap` / `haptics.pickup` / `haptics.snap` into: task complete, task drag-drop, bottom-nav tap (already there), FAB open, swipe actions, pull-to-refresh if present.
- Add light entrance animations only where they don't cost frames; respect `prefers-reduced-motion` and the existing low-energy mode.

## 3. Editable Bottom Nav

- Add a "Customize nav" sheet (long-press the More button or a gear inside the More sheet) that lets the user pick which 6 destinations live in the bottom bar, with drag-to-reorder.
- Persist the chosen ids to the store (new field on `settings`, e.g. `mobileNavOrder: string[]`).
- `BottomNav` reads from that array instead of `MOBILE_NAV.slice(0, 6)`; falls back to the current defaults.
- Improve gestures: swipe between top-level tabs (optional, behind a setting), long-press on a tab to jump straight into the "Customize nav" sheet.

## 4. Editable Sidebar + Favorite Projects

- Make `NAV_GROUPS` items in `Sidebar.tsx` drag-and-drop reorderable (within a group). Persist order to store.
- Add a "Favorites" section at the top of the sidebar.
- On every project row in `/projects` and `ProjectDetail`, add a star toggle that pins it to the Favorites section.
- Drag a project from the Projects list onto Favorites to pin it.

## 5. Project View upgrades (`src/pages/ProjectDetail.tsx`)

- **AI Project Overview**: button "Generate overview" that calls a new edge function `ai-project-overview` (Lovable AI, `google/gemini-2.5-flash`) using project name + linked tasks/notes/goals to produce a short markdown summary stored on the project. Also a "Refresh updates" action that produces a dated activity recap from recent task completions and note edits.
- **Notes-first gallery**: move linked notes to the top of the project page as a responsive gallery of markdown cards (rendered with the existing `NoteMarkdown` component) with a "+ New note" tile.
- **Goals & Habits strip**: above notes, two horizontal chip rows — Goals and Habits — with quick add/remove to link them to this project. Clicking a chip opens that goal/habit.
- **Task filter**: toggle group at the top of the task list — All / Active / Completed — plus a count badge for each.

## Technical notes

- New store fields: `settings.mobileNavOrder: string[]`, `settings.sidebarOrder: Record<string,string[]>`, `settings.favoriteProjectIds: string[]`. All optional with safe defaults.
- New project fields (migration): `projects.ai_overview text`, `projects.ai_overview_updated_at timestamptz`, `projects.linked_goal_ids uuid[]`, `projects.linked_habit_ids uuid[]`. RLS unchanged (still per-user).
- New edge function: `supabase/functions/ai-project-overview/index.ts` using `LOVABLE_API_KEY`.
- Drag and drop: reuse `@dnd-kit` if already installed; otherwise the existing long-press-drag helper.
- Haptics: extend `src/lib/haptics.ts` with `success` and `warning` patterns; respect `lowEnergyMode` to skip them.

## What I'll need from you

1. For #1, can you tell me **which browser** you're using on mobile when Google login fails (Safari, Chrome, or opened from inside Instagram/Facebook/another app), and the exact error message you see? That will save a lot of guessing.
2. For #4, should favorites be **per-device** (localStorage) or **synced across devices** (database)? Synced is nicer but needs a tiny migration.
3. OK to ship in the order above (1 → 5), or do you want a different order?
