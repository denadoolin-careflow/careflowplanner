## Yes — this fits the existing design system

Everything proposed (reset-glass cards, font-display headings, Badge/Input/Textarea/Collapsible, sonner toasts) is already in use on this page. No new dependencies, no new tables. The step shell is a local `step` state plus a small progress dots component.

## What gets built

**Step 1 — "How are you arriving today?"**
Mood pills (same 5) + optional "What's on your mind?" textarea. Continue writes `mood` + `capture_text` locally, then calls generate with those values and advances to Step 2 with a "Carey is reflecting…" loader.

**Step 2 — "Here's what I noticed"**
One narrative card: new `reflection` line at top (acknowledges mood/capture), then energy prose (overall + mood/focus themes + challenge/opportunity woven into sentences), moon summary, and insight. "Learn more" collapsible holds the 7 life areas.

**Step 3 — "Build your day"**
Intention input (defaults to AI suggestion, with the "why" beneath), Top 3 priorities, rhythm timeline — vertical, single card, dividers instead of nested boxes.

**Step 4 — "Close the loop"**
Mantra + save-to-favorites, gratitude as one input with "+ Add another", exhale as a 4-item checklist, recommendations list, then "Complete check-in".

Type scale: body 15px, secondary 13px, section titles 18px `font-display`, eyebrow labels stay small-caps but used sparingly. Chrome reduced to one card per step with `divide-y` internals.

Regenerate lives in the Step 2 header and re-runs with the same mood/capture, keeping you on Step 2.

## Data-model risks worth knowing before we start

1. **The auto-generate-on-mount effect must go.** `DailyCheckIn.tsx:61-63` fires `generate()` as soon as the page loads with no payload. That's exactly the behavior mood-first removes — it has to become "generate only on Step 1 continue". Low risk, but it's the change that actually delivers the personalization.

2. **`generate()` takes no inputs today.** It builds its body from `state`/`record` and guards with `if (!force && record?.ai_payload) return`, with `record` in its dependency array. Passing mood/capture requires changing the signature to `generate({ force, mood, captureText })` rather than relying on `record` having been saved first — saving then generating would race, because `update()` and `generate()` both write through `saveCheckIn` and the state update isn't awaited into the closure. This is the single riskiest part and I'd fix it by passing values explicitly.

3. **`saveCheckIn` merges from localStorage, not from React state.** Two overlapping saves (e.g. step-1 `update()` still in flight when generate's save lands) both read the same local snapshot, so the later write wins on shared keys. Mitigation: one save per step transition, and generate carries `mood`/`capture_text` through in its own save rather than assuming they're already persisted.

4. **`reflection` is a new schema field, and the schema is `strict: true`.** Adding it to `required` is correct for new generations, but **payloads already stored today (and any cached local record) won't have it** — so the TS type must mark it optional and Step 2 must render it conditionally. Same applies if a user reloads mid-day on an old payload.

5. **`capture_text` is currently the answer to the AI's `capture.question`** — a question that doesn't exist yet at Step 1. Reusing the field for "What's on your mind?" is the right call (it's what feeds the AI), but it means the AI-generated capture question no longer has a home. Proposal: show it as a gentle placeholder/prompt-nudge on the Step 4 or drop `capture.question` from the UI entirely and keep it in the schema. Tell me which you prefer; I'll default to dropping it from the UI.

6. **No step state is persisted.** If someone reloads mid-flow they'd restart. Plan: derive the entry step — `completed_at` or an existing `ai_payload` opens at Step 2, otherwise Step 1. Cheap and avoids re-asking mood.

7. **Gratitude is `string[]`** so 1-to-N inputs need no migration; existing 3-entry records just render 3 rows.

## Technical changes

- `supabase/functions/ai-daily-checkin/index.ts`: add `reflection: { type: "string" }` to `SCHEMA.properties` + `required`; accept `journal` (string) in `Body`; add both to the context prompt and a system-prompt line instructing the reflection to name the stated mood/journal directly without repeating it verbatim.
- `src/lib/daily-checkin-store.ts`: add `reflection?: string` to `CheckInAiPayload`.
- `src/hooks/useDailyCheckIn.ts`: change `generate` to accept `{ force?, mood?, captureText? }`, send `mood` + `journal` in the body, and persist `mood`/`capture_text` alongside `ai_payload` in the same `saveCheckIn` call.
- `src/pages/DailyCheckIn.tsx`: rewritten as a step shell; extract `StepArrive`, `StepNoticed`, `StepBuild`, `StepClose` into `src/components/checkin/` to keep files small, plus a `CheckInProgress` dots component.
- `MorningCheckInPrompt.tsx`: copy tweak only, after the flow is built and timed.
