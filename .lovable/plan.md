## CareFlow Brand Alignment — Icons, Empty States, Onboarding, Dialogs, Landing

Bring the new CareFlow Planner logo (seasonal gradient drop + heart + checkmark on warm cream) all the way through the app. Keep it a **visual/brand pass** — no data or logic changes.

### 1. Logo as the app's brand icon

- Copy the uploaded logo (`user-uploads://878AA873...png`) via `lovable-assets` into `src/assets/careflow-mark.png` and update `public/icons/icon-512.png` + favicons to use it.
- `CareFlowMark.tsx`: continue to render the raster mark on a cream plate. Add a new `variant="glyph"` that renders the mark on a **transparent** background (no plate) for inline decorative use, and a `variant="badge"` (the current rounded plate).
- New `SeasonalDropIcon.tsx`: hand-authored SVG version of the mark (gradient drop + heart + checkmark) that inherits `currentColor`-based gradient stops from the seasonal token. Used anywhere the mark needs to scale crisply, tint, or animate (empty states, splash, loading spinners, dialogs).

**Important:** we are **not** replacing every lucide icon in the app with the logo (that would destroy legibility of nav, task rows, buttons). "Replace all icons with this logo" is scoped to **brand touchpoints** — places that currently show a generic `Sparkles`, `Heart`, or old CareFlow mark as *the app's identity*: splash, onboarding intro, auth, empty states, dialog headers, marketing illustrations, favicon, PWA icon. Utility icons (nav rails, task checkboxes, form fields) keep their lucide glyphs but adopt the new `BrandIcon` wrapper with seasonal tone available.

### 2. Empty states — unified `BrandEmptyState`

Create `src/components/ui/BrandEmptyState.tsx`:
- Centered `SeasonalDropIcon` at ~30% opacity, with a soft leaf/sprout accent behind it.
- Nunito Sans title (forest green), muted body copy, optional CTA using the `seasonal` button variant.
- Props: `title`, `description`, `action?`, `tone?` (`forest | seasonal | sage`).

Sweep existing empty states to use it: Inbox, Today (no tasks), Anytime, Someday, Not Today, Logbook, Projects, Notes, Whiteboards, Trips, Habits, Goals, Journal, Pantry, Meals, Grocery lists, Automations, Tags, Reset zones, Family, Caregiving, Mental Load. Where a page inlines an empty message, swap to `<BrandEmptyState />`.

### 3. Onboarding refresh (`src/pages/Onboarding.tsx`)

- Step 0 intro: replace the small `Heart` circle with the full **wordmark lockup** (`CareFlowLogo` with `showWordmark showTagline`) over a cream-to-seasonal-tinted gradient.
- Progress dots: use seasonal gradient fill for completed steps.
- Step chips (season, pillars, MVP): swap ad-hoc icons for `SeasonalDropIcon` accents and `BrandIcon` (leaf, sprout, moon) using the new brand icon mapping.
- Cards: `rounded-3xl`, `shadow-cozy`, cream ivory background.
- CTA buttons: `variant="seasonal"` for primary, `variant="secondary"` (cream/sage) for back.

### 4. Auth + splash + loading

- `Auth.tsx`: cream page, centered wordmark lockup, seasonal primary button, secondary Google button with sage border.
- `FlowLanding.tsx` and any `<Suspense fallback>`: full-bleed cream, animated `SeasonalDropIcon` (gentle float + gradient shimmer) with the wordmark below.
- `Quiz.tsx` page shell: cream base with a soft seasonal drop watermark top-right.

### 5. Dialogs & sheets

- `Dialog`/`Sheet`/`AlertDialog` headers: add a small `SeasonalDropIcon` (24px) beside the title when the dialog represents a **brand moment** (Plan My Day, Daily Check-In, Onboarding sub-dialogs, Publish, AI Suggestions, Upgrade/Pricing prompts). Utility dialogs (task editor, quick add) stay clean.
- Confirmation dialogs: destructive uses `destructive` variant; positive confirmations use `seasonal`.
- Backdrop: warm cream tint (`bg-background/70 backdrop-blur-md`) instead of pure black.

### 6. Marketing illustrations

- Regenerate the two landing images with the new palette:
  - `src/assets/landing-botanical.png` — sage/cream botanical spray with seasonal-gradient accents and a subtle drop-shape motif.
  - `src/assets/landing-story.jpg` — warm cream still life (open planner, mug, plant) in the new palette.
- New `src/assets/brand-drop-hero.png` — hero seasonal drop rendered large for the landing hero background.
- All generated via `imagegen` at premium quality with transparent PNG where useful.

### 7. Landing page redesign (`src/pages/Landing.tsx`)

Full restructure, one distinctive direction — **"Warm Studio"**: warm cream base, forest-green typography, seasonal drop as the recurring visual motif, generous whitespace, Nunito Sans throughout, Fraunces reserved for one hero display line.

Sections top-to-bottom:

```text
┌─────────────────────────────────────────────────────┐
│  Nav: wordmark left · Features/Method/Pricing · CTA │
├─────────────────────────────────────────────────────┤
│  HERO                                                │
│   [Left]  Fraunces display: "Plan with intention.   │
│           Care with heart. Grow every day."          │
│           Nunito Sans subhead + seasonal CTA         │
│   [Right] Large SeasonalDropIcon + floating         │
│           app-preview glass cards (Today, Care,     │
│           Moon) drifting gently                     │
├─────────────────────────────────────────────────────┤
│  TRUST STRIP — "Built for caregivers, parents,     │
│  and busy minds" + soft testimonials row           │
├─────────────────────────────────────────────────────┤
│  THE CAREFLOW METHOD (Capture · Anchor · Rhythm ·  │
│  Exhale) — 4 cards each with a seasonal-tinted     │
│  drop glyph                                         │
├─────────────────────────────────────────────────────┤
│  FEATURE BENTO — 6 tiles (Today, Planner, Care,    │
│  Home Reset, Moon, Meals) with app screenshots     │
│  in cream frames, rounded-3xl, shadow-soft         │
├─────────────────────────────────────────────────────┤
│  STORY BAND — split image + Fraunces pull-quote    │
│  on warm cream                                      │
├─────────────────────────────────────────────────────┤
│  ARCHETYPE QUIZ TEASER — keep embedded quiz        │
│  in a seasonal-bordered card                        │
├─────────────────────────────────────────────────────┤
│  PRICING PREVIEW — 2 cards (Free / Plus) with     │
│  seasonal accent on the recommended plan            │
├─────────────────────────────────────────────────────┤
│  FINAL CTA — full-bleed seasonal-gradient band     │
│  with wordmark, tagline, and "Get started" button   │
├─────────────────────────────────────────────────────┤
│  FOOTER — cream, forest text, small mark            │
└─────────────────────────────────────────────────────┘
```

Details:
- Remove the current indigo shadow / violet-tinted `GlassCard`; rebuild as `bg-card/80` cream glass with sage border.
- Replace `PrimaryCTA`/`SecondaryCTA` inline styles with the new `Button` `seasonal` and `secondary` variants.
- Hero mockup: replace the ad-hoc mock with a real cream-framed screenshot of `/today` (captured once via Playwright, saved to `src/assets/landing-today.jpg`).
- Weather/moon strip: keep the live moon phase + weather chip but restyle to cream pills with seasonal drop icon.
- Motion: `animate-float` on hero drop; `animate-fade-in` on section reveals; gentle `leaf-drift` on decorative sprigs.
- SEO: update `<title>` to "CareFlow Planner — Plan · Care · Grow" and meta description accordingly. Add og:title / og:description / twitter:card. No og:image change (host supplies).

### 8. Icon registry pass

Update `src/lib/nav.ts` icon assignments and `src/lib/area-icons.ts` / `category-icons.ts` / `task-icons.ts` to the brand icon mapping from the brand sheet:
- Plan → `Calendar`, Care → `Heart`, Grow → `Sprout`, Lunar → `Moon`, Money → `Wallet`/`Leaf`, Wellness → `Droplet`, Meals → `Salad`, Family → `Users`, Notes → `NotebookPen`, Habits → `Sprout`, AI → `Sparkles`.
- All rendered through the existing `BrandIcon` wrapper so strokes stay rounded (1.75), with optional `tone="seasonal"` gradient stroke for hero placements.

### Technical summary

Files touched (~30):
- **New:** `src/components/ui/SeasonalDropIcon.tsx`, `src/components/ui/BrandEmptyState.tsx`, `src/assets/careflow-mark.png` (+ asset pointer), `src/assets/brand-drop-hero.png`, `src/assets/landing-today.jpg`.
- **Regenerated images:** `src/assets/landing-botanical.png`, `src/assets/landing-story.jpg`.
- **Updated:** `CareFlowMark.tsx`, `CareFlowLogo.tsx`, `public/icons/icon-512.png`, `index.html` (favicon + meta), `Onboarding.tsx`, `Auth.tsx`, `FlowLanding.tsx`, `Quiz.tsx`, `Landing.tsx` (full redesign), `src/lib/nav.ts`, `area-icons.ts`, `category-icons.ts`, `task-icons.ts`, `Dialog.tsx` / `AlertDialog.tsx` / `Sheet.tsx` header slots, and ~15 empty-state call sites swept to `BrandEmptyState`.

### Out of scope

- No changes to data models, hooks, edge functions, or Supabase.
- Utility lucide icons in nav rails, task rows, buttons, and form fields are kept (adopt `BrandIcon` wrapper only).
- Marketing copy stays close to current wording unless you ask for a rewrite.
- Email templates untouched.
