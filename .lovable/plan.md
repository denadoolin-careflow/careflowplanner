# Trip Planner + Relationship Hub

Sequencing per your answer: **Trip Planner first this turn**, then Relationship + Celebrations Hub in a follow-up turn. The relationship piece is sketched at the bottom so you know where it's headed, but no code for it ships in this turn.

---

## Part 1 — Trip Planner (this turn)

A full trips workspace with embedded Google Maps, itinerary, packing list, and places-to-see / things-to-do.

### Pages & routes

- `/trips` — list of trips (upcoming, current, past) with cover image, dates, destination, status.
- `/trips/:id` — trip workspace, tabbed:
  1. **Overview** — destination, dates, travelers, cover photo, countdown, notes.
  2. **Map** — embedded Google Map with pins for every itinerary stop and saved place. Click a pin → side panel with details.
  3. **Itinerary** — day-by-day timeline. Each day = ordered list of activities (time, title, location autocomplete via Places API New, notes, duration, cost). Drag to reorder, drag between days.
  4. **Places** — saved places to see / things to do, categorized (Eat, See, Do, Stay). Add via Places autocomplete; "Add to itinerary" button.
  5. **Packing** — checklist with categories (Clothing, Toiletries, Docs, Electronics, Other), quantities, packed toggle. Templates: Beach / City / Business / Camping that bulk-insert items.

### Google Maps integration

Google Maps connector is already configured (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` + gateway). Use:
- **Maps JavaScript API** (browser key, `loading=async`, `callback=initMap`, classic `google.maps.Marker`, no `mapId`) for the Map tab.
- **Places API (New)** browser surface (`AutocompleteSuggestion.fetchAutocompleteSuggestions`) for location inputs on itinerary items and saved places.
- **Places API (New) via gateway** in a tiny edge function `places-details` to fetch `displayName`, `formattedAddress`, `location`, `rating`, `photos` for a placeId when the user saves a place. Keeps the browser key off server-side calls.

### Database (one migration)

- `trips` — `user_id, title, destination, start_date, end_date, cover_image_url, notes, status (planning|upcoming|active|completed), travelers text[]`
- `trip_itinerary_items` — `trip_id, user_id, day_date, start_time, end_time, title, notes, place_id, place_name, address, lat, lng, category (eat|see|do|stay|travel|other), cost numeric, sort_order`
- `trip_places` — `trip_id, user_id, place_id, name, address, lat, lng, category, notes, rating, photo_url, added_to_itinerary boolean`
- `trip_packing_items` — `trip_id, user_id, category, name, quantity int default 1, packed boolean, sort_order`

All four: auth-only, RLS scoped to `auth.uid() = user_id`, full GRANTs to authenticated + service_role, updated_at trigger.

Storage: reuse `attachments` bucket for trip cover photos (folder `trips/<trip_id>/`).

### Calendar integration

Itinerary items with a `day_date` + `start_time` surface in the existing Calendar / Today views by adapting the existing tasks/appointments aggregator (read-only feed — items still live in `trip_itinerary_items`).

### Files

New:
- `supabase/migrations/<ts>_trip_planner.sql`
- `supabase/functions/places-details/index.ts` (+ CORS)
- `src/pages/Trips.tsx`, `src/pages/TripDetail.tsx`
- `src/components/trips/`
  - `TripCard.tsx`, `NewTripDialog.tsx`
  - `TripMap.tsx` (Google Maps loader + markers)
  - `TripItinerary.tsx`, `ItineraryItemDialog.tsx`
  - `TripPlaces.tsx`, `PlaceAutocomplete.tsx`, `AddPlaceDialog.tsx`
  - `TripPacking.tsx`, `PackingTemplates.ts`
- `src/lib/trips/api.ts` (CRUD helpers + Places gateway client), `src/lib/trips/maps-loader.ts`

Edited:
- `src/App.tsx` — `/trips`, `/trips/:id` routes
- `src/lib/nav.ts` — "Trips" entry in a Travel group (or under Planning)
- Calendar aggregator (`src/lib/calendar/*` or equivalent) — include itinerary items
- `src/integrations/supabase/types.ts` — regenerated after migration

### Technical notes

- Maps script loaded once via a singleton loader hook with `loading=async` + global `initMap` callback; channel param = `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`.
- Place autocomplete uses session tokens; debounced 250ms.
- Pin colors by category (eat/see/do/stay) using semantic tokens.
- All colors via existing design tokens — no raw hex in components.

---

## Part 2 — Relationship + Celebrations Hub (next turn, preview only)

Will ship after Trip Planner. Locked-in choices:

- **New richer `contacts` table**: `name, relationship, email, phone, address, birthday, anniversary, social (jsonb), photo_url, notes, tags text[], last_contacted_at`. Existing `loved_ones` stays; a one-time UI action will offer to import.
- **Celebrations**: new `celebrations` table (`contact_id, type: birthday|anniversary|holiday|custom, date, recurrence, reminder_days_before int[], gift_idea, gift_budget, gift_status`).
- **Keep-in-touch cadence** per contact (weekly/monthly/quarterly) → surfaces nudges on dashboard.
- **Calendar**: celebrations + reminders feed into existing calendar.
- **Reminders**: in-app + transactional email reminders X days before. Requires email domain setup; will trigger the setup dialog if not configured, then scaffold infra + `send-transactional-email`, and a daily cron edge function that queries upcoming reminders and enqueues emails.
- New pages: `/contacts`, `/contacts/:id`, `/celebrations`.

---

After you approve, I'll implement Part 1 end-to-end (migration → edge function → pages → nav → calendar wiring) and then in the next message kick off Part 2.
