## Goal

Give users a public `/updates` page on the landing site and a "What's new" indicator in the app header, fed by a Lovable Cloud table you (admin) curate. To keep it low-effort, an AI summarizer turns raw GitHub commits into a draft entry you review and publish.

## User flows

- **Public visitor → `/updates`**: scrollable, newest-first list of published entries (date, title, summary, tags like "New", "Improved", "Fixed").
- **Signed-in user → app header**: a small "✨ What's new" pill next to the bell. Dot shows when there are entries newer than their `last_seen_changelog_at`. Click opens a popover with the latest 5 entries and a "See all updates" link to `/updates`.
- **Admin → `/admin/updates`**: list of drafts + published entries, "Pull latest commits" button (calls edge function), "Summarize with AI" on a draft, edit fields, toggle Published.

## Data model (one migration)

`changelog`
- `id`, `title`, `summary` (markdown), `category` (`new` | `improved` | `fixed` | `announcement`), `published` (bool, default false), `published_at`, `created_at`, `updated_at`.
- RLS: public can `SELECT` rows where `published = true`. Only `has_role(auth.uid(), 'admin')` can `INSERT/UPDATE/DELETE`.

`changelog_raw_commits` (admin-only)
- `id`, `sha` (unique), `message`, `author`, `committed_at`, `included_in_entry_id` (nullable FK → changelog), `created_at`.
- RLS: admin-only on all ops.

`profiles.last_seen_changelog_at timestamptz` — used by the in-app indicator. (Adds a column to existing `profiles`.)

Grants on each new table per Cloud rules (`authenticated`, `service_role`; `anon SELECT` only on `changelog` for published rows).

## Edge functions

1. `changelog-pull-commits` (admin-gated): fetches recent commits from the connected GitHub repo via GitHub REST API, upserts into `changelog_raw_commits` by `sha`. Requires `GITHUB_TOKEN` + `GITHUB_REPO` secrets (will prompt user to add via secrets tool).
2. `changelog-summarize` (admin-gated): takes an array of commit SHAs, sends their messages to Lovable AI (`google/gemini-3-flash-preview`) with a system prompt that produces `{ title, summary, category }` JSON, returns a draft (or directly inserts an unpublished `changelog` row and links the commits).

Both validate the caller has the `admin` role via `has_role`.

## Frontend

- `src/pages/Updates.tsx` — public page at `/updates`, SEO meta + JSON-LD, lists published entries.
- `src/pages/admin/AdminUpdates.tsx` — list/edit/publish, "Pull commits", "Summarize selected".
- `src/components/updates/WhatsNewPopover.tsx` — header pill + popover, reads `changelog` + `profiles.last_seen_changelog_at`, updates the timestamp on open.
- Route additions in `src/App.tsx`; header mount in `src/components/layout/HeaderNowStrip.tsx` (or wherever the bell lives).
- Landing site link to `/updates` in the footer.

## Setup the user will need to do

- Confirm there is at least one row in `user_roles` with role `admin` for the user's own account (I'll add a quick check + helper note).
- Connect GitHub to the project (Plus menu → GitHub) and provide a GitHub personal access token (`repo:read`) + `owner/repo` string when prompted — I'll request these via the secrets tool when we get to the edge function.

## Out of scope

- Email digests of updates.
- Per-entry comments/reactions.
- Automatic publishing without admin review (drafts only by default — safer).
