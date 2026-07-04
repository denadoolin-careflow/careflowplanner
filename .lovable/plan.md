# Integrate ChatGPT (OpenAI) across CareFlow — no Lovable AI credits

Goal: every AI edge function calls OpenAI directly using your `OPENAI_API_KEY` by default, with per-user overrides supported. Lovable AI credits are no longer consumed for AI calls.

## 1. Secrets & key resolution

- Add backend secret `OPENAI_API_KEY` (your shared key) via `add_secret`.
- New table `public.user_ai_keys` (`user_id` PK, `provider` text, `encrypted_key` text, `created_at`) with RLS so only the owning user can read/write their own row. GRANTs for `authenticated` + `service_role`.
- Settings page (`/settings` or new `Settings → AI`) lets a user paste their own OpenAI key. Stored via an edge function `save-user-ai-key` that writes to `user_ai_keys` (never returned to the client after save; show masked "sk-••••1234").
- Shared helper `supabase/functions/_shared/openai.ts`:
  - `resolveOpenAIKey(userId)` → returns user's key if present, else `Deno.env.get("OPENAI_API_KEY")`.
  - `callOpenAI({ userId, messages, model = "gpt-5-mini", response_format?, stream? })` → hits `https://api.openai.com/v1/chat/completions` with `Authorization: Bearer <key>`.
  - Handles 401 (bad key), 429 (rate limit), 402/insufficient_quota errors and returns normalized `{ error }`.

## 2. Replace Lovable AI gateway across all edge functions

For every function under `supabase/functions/ai-*` and `carey-chat` (~40 functions), swap:

- `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { headers: { "Lovable-API-Key": ... } })`
- → `callOpenAI({ userId, ... })` from the shared helper.

Model mapping (all default to `gpt-5-mini` unless a function explicitly needs stronger reasoning):


| Current call site                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | New model                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Fast/summary/JSON functions (ai-notes, ai-inbox-triage, ai-subtasks, ai-task-assist, ai-grocery-assistant, ai-dinner-tonight, ai-capture-assistant, ai-cleaning-*, ai-cosmic-daily, ai-daily-*, ai-exhale, ai-mental-load, ai-memory-recap, ai-rhythm-insights, ai-habit-overview, ai-planner, ai-month-plan, ai-monthly-report, ai-projects-summary, ai-routine-*, ai-seasons-assistant, ai-today-guidance, ai-weekly-review, ai-library-meals, ai-meal-plan, ai-person-overview, ai-project-overview, ai-care-guide, ai-care-note, ai-caregiving-hub, ai-cosmic-*, ai-journal, ai-pdf-summary, ai-voice-capture, ai-home-assistant) | `gpt-5-mini`                                                            |
| `carey-chat` (streaming assistant)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `gpt-5-mini` with streaming                                             |
| Voice (`ai-voice-capture`) — still needs Whisper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `whisper-1` via `/v1/audio/transcriptions` (also OpenAI, uses same key) |


JSON-mode calls use `response_format: { type: "json_object" }` (already the shape most functions expect).

## 3. Remove Lovable credit metering

- `_shared/ai-meter.ts` currently gates on Lovable credit weight. Two options; plan uses **B**:
  - **A.** Delete the meter — every AI call is free from your app's perspective (you pay OpenAI directly).
  - **B.** Keep the table but only record usage counts (no gating), so you still see per-user AI call volume in `ai_usage`. Recommended for cost visibility.
- Update `meterRequest` to skip the quota check and just increment `ai_usage` with a per-model weight (1 for mini, 3 for gpt-5, etc.).
- Client `useAIUsage` keeps working; the "upgrade" prompt in `aiInvoke` (`ai_quota_exceeded` 402) still fires only if you explicitly enforce a cap later.

## 4. Frontend touches

- `src/pages/Settings*` → new "AI (ChatGPT)" section: paste-your-own-key field, test button, "using shared key" indicator.
- Wording: replace user-facing "AI credits" copy with "AI usage" (Cosmic, Mental Load, etc.). No changes to component logic.
- No changes to `aiInvoke` transport — same edge-function calls, same shape.

## 5. Streaming (carey-chat)

`carey-chat` currently streams from Lovable gateway. Switch to OpenAI SSE streaming:

- POST `/v1/chat/completions` with `stream: true`.
- Pipe SSE chunks straight through as `text/event-stream` (or reformat to the existing `useChat` UI stream shape — keep the client contract unchanged so no UI edits needed).

## 6. Verification checklist

- `OPENAI_API_KEY` present in secrets; a call from `ai-notes` returns a real completion.
- User pastes a per-user key → subsequent call uses it (log the resolved-key source, not the value).
- `carey-chat` streams token-by-token in the UI.
- `ai-voice-capture` transcribes via Whisper.
- `ai_usage` table increments; no credit-exhausted banner appears.
- Grep for `ai.gateway.lovable.dev` → zero remaining hits in `supabase/functions/`.

## Technical details

- Migration: `user_ai_keys` (RLS: `auth.uid() = user_id` for select/insert/update/delete; GRANT select/insert/update/delete to `authenticated`, all to `service_role`).
- Encryption at rest: pgcrypto `pgp_sym_encrypt` with a `USER_AI_KEY_SECRET` (generated via `generate_secret`, 64 chars). Decrypt only inside the `_shared/openai.ts` helper.
- OpenAI errors surface via existing `aiInvoke` → toast; keep the 402 dispatcher for future paid tiers but no default trigger.
- No changes to `src/integrations/supabase/client.ts`, `.env`, or `config.toml`.

- Anthropic/Claude support.
- Per-feature model overrides in Settings (e.g. "use gpt-5 for Rhythm Insights").
- Streaming for functions other than `carey-chat`.