# A richer Chapter page: your year's guide, birthday chart and moon rhythm

The Chapter page currently shows only the AI-written chapter. It will gain three new sections, all calculated on your device and explained in plain, gentle language, plus one summary that ties them together. The AI chapter stays at the bottom, so this page keeps working even when the reading service is busy.

## 1. "What to expect" summary (top of the page)
- A short three- to five-sentence summary built from the sections below. For example: "This is a 6th-house year guided by Mercury: daily rhythms and health take centre stage. Your birthday chart puts the Sun in the 10th house, so work and visibility keep coming up. You're in a Crescent progressed-moon phase, a time to push past early doubts. This month's Moon is waxing toward full in Aries."
- Three plain "lean into" and "go gently with" points.
- Buttons: "Journal this" (adds it to today's note) and "Send focus to Planner".

## 2. Time lord of the year
- Shows your profection year: your age, which house is activated, its sign, and the planet that rules the year (the time lord), with start and end dates.
- **What it means:** the life areas this house covers, the time lord's style, and how strong that planet is in your birth chart.
- **The time lord right now:** where it's moving today, its sign and house, whether it's retrograde, and any aspects it's making to your chart. These are the moments this year's story tends to come into focus.
- **Next year:** a small preview of the house and time lord coming up next.

## 3. Solar return (your birthday chart)
- Shows the date and time of your most recent solar return, plus a countdown to the next one.
- The year's chart: its rising sign, the Sun's house, the Moon's sign and house, and the planets on the chart's angles.
- A short explanation of each piece, plus a mini chart wheel of the birthday chart.
- Without a birth time or place, it uses whole signs from your Sun's sign and explains what that means.

## 4. Moon phase cycle
- **Progressed moon cycle (your life-season):** your current phase out of eight (New → Crescent → First Quarter → Gibbous → Full → Disseminating → Last Quarter → Balsamic), each about 3.5 years. It shows a progress bar, the date you entered this phase, the year you'll reach the next one, and what each phase asks of you.
- **This month's Moon:** today's phase, plus the next new and full Moon and where each falls in your chart. It links to Moon & Rituals.

## 5. Layout
- **Mobile:** sections stack, and each can be collapsed.
- **Desktop:** two columns, with the summary across the full width at the top.
- **Order:** Summary → Time lord → Solar return → Moon cycles → AI chapter.
- The AI chapter request also receives the time lord, solar-return highlights and progressed phase, so the written chapter matches these sections.

## Technical details
- New pure module `src/lib/cosmic/year-chapter.ts`, with tests:
  - `timeLordReport(chart, on)`: wraps `computeProfection`. Returns the time lord's current position, sign and house, retrograde state, dignity, major aspects to natal points, and next year's profection.
  - `solarReturnChart(chart, on)`: finds the last and next solar return by reusing the return sweep from the previous birthday, then builds the chart with `computeNatalV2` at that exact moment and the birth location. It returns the rising sign, the Sun and Moon houses, and planets within 8° of an angle.
  - `progressedLunation(birth, on)`: phase from `computeProgressions`, with entry and next-phase dates found by stepping year by year.
  - `chapterSummary(...)`: deterministic sentences from template copy per house, planet and phase.
- Copy maps for the 12 houses, 7 time lords, 8 progressed phases and solar-return Sun houses.
- `CosmicChapter.tsx` is reorganised into the new sections (components under `src/components/cosmic/chapter/`), and the existing `NatalWheel` is reused for the birthday chart.
- `ai-cosmic-chapter` gets three extra optional context fields. Its existing retry and soft-busy handling stays unchanged.
- No database changes.
