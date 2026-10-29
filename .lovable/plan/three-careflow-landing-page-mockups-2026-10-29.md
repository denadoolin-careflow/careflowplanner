# Three CareFlow landing page mockups

Build one preview page with a switcher between three full landing page designs. All three use your copy word for word, the four-phase brand colors (sage, golden yellow, terracotta, coral), Playfair Display headings and Nunito Sans body. "Join the Waitlist" is the main button throughout. Your live landing page and its editor stay as they are.

## Mockup A — Calm Lifestyle (your recommendation)
- Spacious cream hero: "Life is more than a to-do list." with a phone preview of Today beside it.
- A flowing four-phase gradient ribbon; tapping Plan / Grow / Care / Let go shows that phase's card.
- Phone previews of Today, Projects, Care and Reflection in a gentle scrolling row.
- Soft serif headings and a lot of open space, like a magazine.

## Mockup B — Seasonal Journey
- Sections move through the four phases like seasons as you scroll down: the background shifts from sage to gold to terracotta to coral.
- The moon in the hero changes from new to full to waning as you scroll.
- Features are laid out as a connected path of six stops.
- The philosophy lines ("Plan with intention…") appear as large painterly section breaks.

## Mockup C — Bento Dashboard
- Modern grid of tiles: a hero tile, phase tiles and feature tiles with small previews of the app.
- "Who it's for" shown as swipeable cards.
- More product-focused, closest to modern app sites, but still warm.

## What you'll see
- A new preview page with tabs A / B / C, working on phone and desktop.
- After you pick one (or a mix), I can replace the real landing page with it and connect it to your landing page editor.

## Technical details
- New route `/landing-mockups` (outside app layout), single file per mockup under `src/pages/landing-mockups/`.
- Reuse existing brand tokens, CareFlowLogo and rhythm phase tokens; copy held in a shared constants file.
- No database changes. Check at 384px and desktop with Playwright.
