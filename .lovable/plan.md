## Rebuild Landing page to match the mockup

Rewrite `src/pages/Landing.tsx` as a pixel-faithful implementation of the uploaded mockup, using existing brand tokens (cream base, forest primary, seasonal gradient, Nunito Sans body, Fraunces display).

### Sections (top → bottom)

1. **Sticky Nav** — Left: `CareFlowLogo` lockup with wordmark + "PLAN · CARE · GROW" tagline. Center: Home / Features / The Method / Quiz / Pricing / About / Blog. Right: "Sign in" text link + forest-green pill "Get Started" CTA.

2. **Hero (2-col split)**
   - Left: small pill "PLAN · CARE · GROW" (seasonal-tinted). Fraunces display headline: **"The all-in-one planner for the *beautiful chaos* of family life."** with "beautiful chaos" in italic seasonal gradient (amber → violet). Body copy. Three CTAs: black "Download for iOS" (Apple glyph), white bordered "Download for Android" (Play glyph), lavender-tinted "Take the Quiz" pill. Avatar stack + 5-star rating + "Loved by 10,000+ caregivers".
   - Right: Phone mockup screenshot of a Today view (day pills, Today's Plan 75% ring, Top Priorities list, Care Reminders, bottom tab bar). Floating dark-green circular badge "Designed for caregivers. Built for real life." Floating white "Moon in Taurus Today" glass card. Botanical sprigs + vases + book stack behind. Generated as a premium image (`src/assets/landing-hero-phone.png`).

3. **Feature Strip** — 5 icon tiles in a cream rounded panel: Plan Your Days (calendar / forest), Care for What Matters (heart / rose), Nourish Your Family (leaf / sage), Align with Nature (moon / lavender), Manage Your Money (dollar / sky). Each: circular tinted icon → title → 2-line description.

4. **Caregiver Archetype Quiz band** — Lavender gradient card. Left: white glass card with heart badge, "CAREGIVER ARCHETYPE QUIZ" eyebrow, "Which kind of caregiver are you?" headline, 90-second copy, gradient "Take the Quiz →" button. Center: "Understand your natural care style." + 5 archetype mini-tiles (Caregivers, Neurodivergent Minds, Rhythm Planners, Rebuilders, Home & Family). Right: floating quiz-question card mock ("What energizes you most in your day?" with 4 options).

5. **Archetype Grid** — "Which kind of caregiver are you?" section with 10 archetype cards in a 5×2 grid (Mental Load Carrier, Burnt-Out Caregiver, Neurodivergent Navigator, Gentle Homemaker, Moon-Guided Planner, Rebuilding Dreamer, Quiet Provider, Reset Seeker, Burnt-Out Protector, Rebuilding Father, Neurodivergent Dad). Each: emoji + title + italic quote.

6. **Community band** — Left column: "JOIN A COMMUNITY THAT GETS IT" eyebrow, Fraunces "You're not alone in this." + supporting copy. Right: 3 testimonial glass cards with quote marks, blurb, avatar + name.

7. **Final CTA footer band** — Full-bleed seasonal gradient (forest → amber → violet). Left: "Your calm. Your rhythm. Your flow." + subcopy. Right: black "Download on the App Store" + "Get it on Google Play" buttons, a QR code placeholder image, small tagline "Plan with intention. Care with love. Grow together." with heart doodle.

### Technical notes

- Keep the file self-contained in `src/pages/Landing.tsx`; extract only a small `PhoneMockup`, `ArchetypeCard`, and `TestimonialCard` sub-component locally.
- Reuse `Button` `seasonal` and `outline` variants; forest CTA = `bg-primary text-primary-foreground rounded-full`.
- All colors via existing tokens (`--primary`, `--gradient-seasonal`, `--accent`, `--muted`); no hex literals in JSX.
- Generate one hero image (premium, 1200×1600) of the phone mockup + botanical scene to avoid re-implementing every element in DOM. Archetype and testimonial avatars use existing seed avatars or `dicebear` initials fallback already in project.
- Fraunces italic for the accent phrase; wrap "beautiful chaos" in `<span className="italic bg-gradient-seasonal bg-clip-text text-transparent font-display">`.
- Keep the embedded `CaregiverArchetypeQuiz` reachable via the "Take the Quiz" CTAs → `/quiz`.
- Update `<title>` / meta already handled in `index.html`.

### Out of scope

- No routing, data, or auth changes.
- Existing `/quiz` page and `CaregiverArchetypeQuiz` component untouched.
- No new fonts — Fraunces (`font-display`) and Nunito Sans (`font-brand`/body) already loaded.
