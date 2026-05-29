
# Family Sharing: Dinner Requests, Grocery Lists, Calendar

Introduce a lightweight "household" so multiple signed-in family members can collaborate on three things: a weekly dinner request form, grocery lists, and a shared calendar. All three reuse the same household + membership model so we only build sharing once.

## 1. Households & membership

- New table `households` (name, created_by).
- New table `household_members` (household_id, user_id, role: `owner` | `editor` | `viewer`, display_name, joined_at, invited_email).
- New table `household_invites` (household_id, email, token, role, expires_at, accepted_at).
- Owner creates a household from a new **Settings → Family** screen, invites by email. Invitee gets a link `/join/:token`; if signed-in (or after sign-up) they're added as a member.
- A `useHousehold()` hook exposes `currentHousehold`, `members`, `switchHousehold`. Current household id is persisted to `localStorage` and to a `profiles.current_household_id` column so it follows the user across devices.

## 2. Dinner request form (candidates + free requests)

For each week, the planner picks 2–4 candidate meals per dinner slot from the existing `meals_library`. Family members open a shared link or in-app page and:
- Vote (👍 / favorite) on each night's candidates.
- Submit a free request — either picking any meal from the household's library OR typing a custom dish + optional notes (e.g. "Friday: tacos please").

Schema:
- `dinner_polls` (household_id, week_start, created_by, status: `open` | `closed`, notes).
- `dinner_poll_candidates` (poll_id, day_date, slot='dinner', meal_id nullable, custom_title nullable, position).
- `dinner_poll_responses` (poll_id, member_id or user_id, day_date, kind: `vote` | `request`, candidate_id nullable, meal_id nullable, custom_title nullable, note, created_at).

UI:
- New **Meals → Family Requests** tab: planner builds the week's candidates from the library (drag from sidebar), publishes the poll.
- Results panel shows tallies per night + a "Requests" feed; one-click "Add winner to week plan" pushes the meal into the existing weekly plan.
- Family members see a clean voting screen; can also pick any library meal as a request.

## 3. Collaborative grocery lists

Upgrade existing `grocery_lists` so a list belongs to a household instead of a single user:
- Add nullable `household_id` and keep `user_id` as creator.
- New policy: any member of the household can read/edit/delete lists where `household_id` matches a household they belong to.
- Add `grocery_list_activity` (list_id, user_id, action, item_name, at) for a lightweight "Jane checked off milk · 2m ago" feed.
- Enable Supabase Realtime on `grocery_lists` so checkboxes update live across members.
- UI: in the existing grocery list screen add a "Shared with family" toggle (only visible when a household exists), member avatars, and a recent-activity sidebar.

## 4. Shared family calendar

Same pattern for `appointments`:
- Add nullable `household_id` and `visibility` (`private` | `household`).
- New policy: members can read household-visibility events; only the creator or household owner can edit/delete.
- New "Family" calendar layer toggle in Week, Month, and Day views — color-codes events by member, with a legend.
- Inline "Share with family" checkbox in the appointment editor.
- Dinner-poll winners can optionally be auto-added as household appointments (off by default).

## 5. Auth & invite flow

- Email + Google sign-in (Google added in same pass since multi-user requires real accounts).
- `/auth` already exists; add `/join/:token` route that resolves an invite, requires sign-in, then inserts into `household_members` and redirects to the household home.
- Profile auto-create trigger already exists; extend it to also create a personal household so single users keep working unchanged.

## Technical notes

- RLS for every new table uses a `is_household_member(_uid, _household_id)` SECURITY DEFINER helper to avoid recursive policies.
- All new public tables get explicit `GRANT` statements for `authenticated` and `service_role`.
- Realtime: enable on `grocery_lists`, `grocery_list_activity`, `dinner_poll_responses`, and `appointments` for live collaboration.
- One edge function `send-household-invite` uses Lovable's built-in transactional email to email the invite link.
- Client state: extend `src/lib/store.tsx` to scope queries by `currentHouseholdId` when set; legacy queries by `user_id` still work for personal data.
- No removal of existing personal flows — sharing is additive.

## Out of scope (this round)

- Per-night meal AI suggestions inside the poll (can use existing AI generator manually).
- SMS invites / push notifications — email only.
- Recipe attachments to calendar events.

Confirm and I'll build it.
