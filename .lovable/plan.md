## 1. Fix the Auth page

Rewrite `src/pages/Auth.tsx` so it's a single centered card on a soft sage/cream background:

- Remove the two-column hero layout, the feature pills grid, and the embedded quiz card.
- One container: `min-h-screen flex items-center justify-center px-4`.
- Card: max-width ~420px, rounded-3xl, soft shadow, contains:
  - CareFlow logo mark + "CareFlow Planner" eyebrow, centered.
  - H1 "Welcome back" / "Create your account" (changes with active tab).
  - Sign in / Sign up tabs (existing logic preserved).
  - Email + password (+ name on signup), primary CTA, Google button, "Email me a magic link" link, "Forgot password?" link.
  - In-app browser warning + OAuth error banners stay, restyled inside the card.
- Replace `gradient-dawn` background with the landing-page sage→cream radial so it feels like the same product.
- Keep all existing auth handlers (`signIn`, `signUp`, `signInGoogle`, `sendMagicLink`, OAuth error parsing) unchanged.

## 2. Embed the Caregiver Quiz on the landing page

In `src/pages/Landing.tsx`, replace the current "Quiz" promo section (the one with the rotating archetype cards) with the actual quiz:

- New full-width section anchored at `#quiz`, with the existing Pill + headline ("Find your caregiver archetype").
- Below the headline, render `<CaregiverArchetypeQuiz embedded />` inside a rounded card on a soft cream surface.
- After completion (the component already stores the result in localStorage), show a "Join the waitlist with this archetype" CTA that links to `/waitlist`.
- Keep the existing standalone `/quiz` route as-is for direct links.

## 3. Pricing page (waitlist-only)

New route `/pricing` → `src/pages/Pricing.tsx`:

- Sage palette, matches landing page chrome (reuse `Pill`, `PrimaryCTA`).
- Hero: "Pricing is coming soon" + subhead "We're polishing the plans. Join the waitlist to get early access and founding-member pricing."
- Three teaser cards (Free / Pro / Family) shown as blurred placeholders with a "Coming soon" badge — no prices.
- Big CTA card with the waitlist form (see step 4) embedded directly.
- Add "Pricing" link in the landing nav + footer.

## 4. Waitlist signup + backend

Add a `Waitlist` page at `/waitlist` (also embedded on `/pricing`) that collects:

- Email (required)
- Name (required)
- Archetype (auto-filled from `loadQuizResult()` if available, otherwise a dropdown of the 7 archetypes)
- "Why you're interested" (textarea, optional, 500-char limit)

Form uses zod validation + a Supabase insert. On success, fires the two automated emails (step 5) and shows a sage success state with a "Take the quiz" link for users who haven't.

### Database

Migration creates `public.waitlist_signups`:

- `id uuid pk`, `email text unique not null`, `name text not null`, `archetype text`, `reason text`, `quiz_score jsonb`, `source text` (e.g. `pricing`, `landing`), `created_at timestamptz`.
- RLS on. Policy: anyone can `INSERT` (anonymous signups), only authenticated admins can `SELECT`. Admin check via a `user_roles` table with an `admin` role + `has_role()` security-definer function (per platform best practice).
- Unique constraint on lowercased email handled via a `before insert` trigger that normalizes email and rejects duplicates with a friendly error.

## 5. Automated emails (Lovable Emails)

Use Lovable's built-in email infrastructure. Required setup:

1. Set up email domain (user completes the in-product dialog).
2. Provision email infrastructure (queues, tables, cron).
3. Scaffold auth email templates so signup confirmations, magic links, and password resets match the sage brand.
4. Scaffold the transactional email pipeline.
5. Create two transactional templates in `supabase/functions/_shared/transactional-email-templates/`:
   - `waitlist-welcome.tsx` — branded confirmation to the signup ("You're on the CareFlow waitlist 🌿"), warm sage styling, mentions their archetype if provided.
   - `waitlist-admin-notification.tsx` — internal email to your address with name, email, archetype, reason.
6. Register both in `registry.ts`, deploy edge functions.
7. The waitlist form invokes `send-transactional-email` twice (welcome → user, admin notification → owner) with idempotency keys derived from the new row id.

Admin recipient address is needed — I'll ask for it during build (defaults to the Lovable account email shown in the prompt).

## Files touched

- `src/pages/Auth.tsx` — rewrite for centered layout.
- `src/pages/Landing.tsx` — replace quiz teaser with embedded `CaregiverArchetypeQuiz`, add Pricing + Waitlist nav links.
- `src/pages/Pricing.tsx` — new.
- `src/pages/Waitlist.tsx` — new (also reused as a component inside Pricing).
- `src/App.tsx` — add `/pricing` and `/waitlist` routes (public).
- New migration: `waitlist_signups` table + `user_roles` + `has_role()` + RLS.
- New Supabase email templates + registry update.
- Lovable Email infra setup (domain dialog, infra, auth templates, transactional scaffold, deploy).

## Technical details

- Quiz already exposes `embedded` mode and persists results in localStorage via `loadQuizResult()` — reused as-is on both Landing and Waitlist.
- Waitlist insert uses the anon client; RLS policy `INSERT to anon` is scoped to this single table.
- `has_role(_user_id uuid, _role app_role)` is a `security definer` function on a separate `user_roles` table (never on profiles), per platform security rules.
- Email body backgrounds stay `#ffffff`; sage accents applied via inline styles inside React Email components.
- No marketing/bulk emails — both messages are 1:1 transactional sends triggered by the signup event.
