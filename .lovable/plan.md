# Natal chart redesign (astrosuite-style bi-wheel)

Restyle the Natal page chart to match the reference: a large, airy bi-wheel with your birth chart inside and today's transits on an outer ring.

## What you'll see
- **Big centered wheel** on a soft light background, with thin hairline rings and no heavy fills.
- **Zodiac signs** as small colored glyphs around the outer edge (fire red, earth green, air blue, water teal).
- **Inner ring: your birth chart.** Each planet has a colored glyph, its degree and minute (for example "25°16′") written along the line to it, and a short tick marking its exact spot. The Ascendant (As) and Midheaven (Mc) are labeled.
- **Outer ring: current transits** in the same style, with retrograde degrees shown in red.
- **Numbered houses 1–12** in a thin band around the center hub. The 9th house (your time-lord house) gets a soft lavender shade.
- **Aspect lines** across the center: thin red for challenging, blue for flowing, gray for neutral. The tightest aspects are drawn thicker.
- **Two info cards** at the top corners: your birth date, time and place on the left, and "Current transits" with today's date and time on the right. Each card shows a faint sign watermark.
- "Last updated" time under the wheel, plus a download button that saves the chart as an image.
- On phones the cards stack above the wheel, and the wheel fills the screen width.

## Notes
- Without a saved birth time and place, the wheel falls back to counting houses from your Sun sign, as it does now. A small prompt will invite you to add those details.
- Tapping planets, houses and signs still opens their detail pop-ups.

## Technical details
- Rebuild the drawing in `NatalWheel.tsx` as a larger bi-wheel (about 720 units across, scaling to fit) with sign, transit, natal and house rings, plus an aspect hub. Use leader lines with rotated degree labels and collision spreading on both rings.
- Colors come from new semantic tokens in `index.css` (element colors and aspect colors), not raw hex.
- `CosmicNatal.tsx`: the "Show transits" switch defaults to on for this layout. Add the corner cards and the download button, which serializes the SVG to PNG.
- Data comes from the existing chart, transit and aspect helpers; no backend changes.
