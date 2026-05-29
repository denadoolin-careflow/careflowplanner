# CareFlow Launch Prep Plan

Based on your answers, here's the concrete launch plan, ordered so each step unblocks the next.

## 1. Legal pages (no dependencies — do first)

Create two new public routes using your existing soft, light Pricing-page aesthetic.

**`/privacy` — Privacy Policy**
Tailored to CareFlow's real data flows. Sections:
- Who we are: CareFlow Planner, operated by Dena Doolin (United States). Contact: hello@careflowplanner.app
- Data we collect: account (email, name), planning data (tasks, routines, habits, journals, meals, home maintenance), sensitive health-adjacent data (cycle logs, mental load check-ins, mood, caregiving notes), uploads (meal images, home documents, attachments), device/usage signals
- Why we collect it: deliver the service, personalize AI suggestions, sync across devices
- AI processing disclosure: prompts sent to Google and OpenAI via Lovable AI Gateway; 30-day provider retention; **not used to train models**; users can avoid AI features entirely
- Sharing: no selling; subprocessors (Lovable Cloud/Supabase, Lovable AI Gateway, Paddle, Google Maps, optional Google Calendar)
- Storage & security: encrypted in transit and at rest; row-level security
- Your rights: export, delete, correct — email hello@careflowplanner.app
- Retention: until account deletion; backups purged within 30 days
- Children: not for users under 16; accounts created by minors will be removed
- International users: data stored in the US
- Analytics: "We plan to add privacy-friendly analytics in the future; we will update this policy and notify users before enabling it."
- Changes: notice via email and in-app
- Last updated date

**`/terms` — Terms of Service**
- Acceptance, account, acceptable use, subscriptions & billing (handled by Paddle as Merchant of Record), refunds (Paddle policy + 14-day EU statutory), cancellation, IP, **medical disclaimer** ("CareFlow is not a medical device and does not provide medical advice. Cycle, mood, and mental load features are for personal reflection only. Consult a licensed clinician for medical decisions."), AI disclaimer ("AI output may be inaccurate; verify before acting"), limitation of liability, termination, governing law (Delaware/your state of incorporation — confirm), contact

Both pages: plain language, mobile-friendly, linked from footer + auth page + Paddle checkout.

## 2. Paddle payments setup

Run the eligibility check, then enable Paddle (the right call for a global digital subscription).

After Paddle is enabled, create three products:
- **Pro Monthly** — $8.99/mo
- **Pro Yearly** — $59.99/yr (founding-member intro: $39.99/yr first year)
- **Family Monthly** — $14.99/mo
- **Family Yearly** — $99.99/yr (founding-member intro: $64.99/yr first year)
- **Lifetime Pro** — $129 one-time (limited founding offer)

Implement checkout sessions + webhook handler that writes subscription status to a new `subscriptions` table.

## 3. AI metering + feature gating

New table `ai_usage` (user_id, month, weighted_calls, model_tier). Edge function wrapper that:
- Looks up active plan
- Computes weight: simple suggestion = 1, voice capture = 3, journal recap = 5
- Blocks or downgrades to Flash when monthly cap is hit:
  - Free: 10 weighted calls, Flash only
  - Pro: 300 weighted (≈30 may be Pro-tier model)
  - Family: 800 pooled across seats

New `lib/entitlements.ts` with `can(user, feature)` — gates AI buttons, mental load tools, cycle, family seats. Free tier hard limits: 3 habits, 1 routine, 5 journal entries/week.

## 4. Rebuild `/pricing` with real numbers

Replace the "Revealed at launch" placeholder pricing with the live tiers, monthly/yearly toggle, founding-member banner, FAQ (refunds, cancel anytime, what AI does with data → link to `/privacy`), and Paddle checkout buttons.

## 5. Footer + auth links

Add a small footer (Privacy · Terms · Pricing · Contact) to `AppLayout` and the marketing pages so legal pages are discoverable.

## Technical notes

- New routes: `/privacy`, `/terms` (public, like `/pricing`)
- New tables: `subscriptions` (user_id, plan, status, paddle_subscription_id, period_end, seats), `ai_usage` (user_id, month, weighted_calls)
- New edge functions: `paddle-webhook`, `paddle-checkout`, `ai-meter` (wrapper) — or fold metering into existing AI functions via shared helper in `_shared/ai-meter.ts`
- New lib: `src/lib/entitlements.ts`, `src/lib/plan.ts`
- Reuse Pricing page's soft cream/sage aesthetic for `/privacy` and `/terms`

## What I need from you before building

1. **State of incorporation** for the Terms governing-law clause (or "United States, [State]" if you're a sole proprietor)
2. Confirm: founding-member intro pricing applies **first year only** then renews at standard rate? (industry norm)
3. Confirm Lifetime Pro $129 is in scope for v1 or hold for later?
4. Confirm seats per Family plan: **5**?

Once you confirm, I'll build it in this order: legal pages → Paddle enable → products → checkout + webhook → metering/gating → pricing page rebuild → footer.
