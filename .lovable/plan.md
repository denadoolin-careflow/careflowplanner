## Goal

Finish the `/updates` system: get GitHub pulling commits, add a discoverable "What's new" link on the landing footer, give you a reusable user-facing release notes template, and let users opt in to email notifications when new updates are published.

## 1. GitHub secrets

The migration already ran when it was created — no need to paste anything into the SQL editor. The remaining setup is the two GitHub secrets so the `changelog-pull-commits` edge function can reach your repo:

- `GITHUB_TOKEN` — a fine-grained personal access token with **Contents: Read** on the repo.
- `GITHUB_REPO` — the repo in `owner/repo` form (e.g. `yourname/careflow`).

I'll trigger the secrets prompt once we move to build. You enter the values in the secure form; nothing about them is stored in code.

## 2. Landing footer "What's new" link

Find the landing footer (likely in `src/pages/Index.tsx` or a `Footer` component used by the landing route) and add a `<Link to="/updates">What's new</Link>` next to the existing Privacy/Terms links. Match the surrounding text style — no new design tokens.

## 3. User-facing release notes template

A markdown stub I'll drop into the admin editor's "New entry" flow so every published update has a consistent shape. Used as the default `summary` when you create a draft manually or after AI summarization:

```
**What changed**
- …

**Why it matters**
- …

**Heads up**
- … (optional: anything to watch for)
```

Plus a small "Insert template" button in `AdminUpdates.tsx` next to the summary field so you can drop it in at any time, and the AI summarizer's system prompt will be nudged to produce summaries in this shape.

## 4. Email notifications (opt-in)

### Data
- Add `profiles.notify_on_updates boolean default false`.
- A simple `Settings` toggle: "Email me when new updates ship."

### Sending
Use Lovable Emails (built-in). Required setup before sends work:
1. Email infrastructure (`setup_email_infra`) — creates the queue, send log, suppression list, unsubscribe tokens.
2. App email scaffolding (`scaffold_transactional_email`) — creates `send-transactional-email`, unsubscribe + suppression handlers, and the templates folder.
3. A new React Email template `changelog-update.tsx` in `supabase/functions/_shared/transactional-email-templates/` with: title, category badge, summary (rendered as plain text — markdown won't be parsed inside the email), and a "Read on CareFlow" button to `/updates`.

If no email domain is configured yet, I'll surface the email setup dialog first — you pick a sender subdomain, Lovable handles DNS delegation, and sends activate once DNS verifies.

### Trigger
A new edge function `changelog-notify` (admin-gated) that:
- Takes a `changelog.id`.
- Fetches all profiles where `notify_on_updates = true` and email is verified.
- For each, invokes `send-transactional-email` with `templateName: "changelog-update"`, an idempotency key of `changelog-${entryId}-${userId}`, and the entry's title/category/summary as `templateData`.

Wired into the AdminUpdates "Publish" action: after toggling `published = true`, if `published_at` was just set, prompt "Send email to subscribers?" — if yes, invoke `changelog-notify`. The idempotency key prevents duplicate sends if you re-trigger.

### User-facing
- Settings toggle (default off).
- Every email has the standard Lovable Emails unsubscribe footer (auto-added).

## Setup you'll need to do

- Enter `GITHUB_TOKEN` + `GITHUB_REPO` when prompted.
- If no email domain yet, complete the email setup dialog (one-click, DNS handled by Lovable).

## Out of scope

- Digesting multiple updates into one email (each published entry sends one email).
- Per-category subscription preferences (single on/off toggle for now).
- In-app push notifications.
