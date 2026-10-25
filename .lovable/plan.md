# Seasonal month headers

## What you'll see
A picture card at the top of each month, in the same style as the new Today header. It shows up in two places:
- The Planner **Month** tab
- The **monthly notebook** note for that month

Each card shows:
- The month and year in a large serif heading, e.g. "October 2026"
- The nature season and a short theme, e.g. "Autumn · Apple Orchard"
- The zodiac seasons that fall in the month, with their dates, e.g. "♎ Libra until Oct 22 · ♏ Scorpio from Oct 23", plus a one-line theme for each
- Small chips for the month's new moon and full moon, with their dates
- A soft painted picture behind the text. Each month gets its own picture matching its nature season (for example, snowy pines in January, cherry blossoms in April, orchards in October). The picture also has a subtle tint in the colors of the zodiac sign's element.

On phones the text stacks and stays readable. When you change months, the picture fades to the new one.

## Technical notes
- Make 12 month pictures with the fast image tier and save them in src/assets.
- Create a new shared `MonthSeasonHeader({ month })`. It uses the existing data: `seasonFor`/`SEASON_META`, `zodiac-seasons.ts` (sign changes within the month), and `monthRhythmMoments` (new and full moons). There is no new data or schema.
- Place it at the top of the month layout in `PlannerMonthView`/`PlannerMonthExperience`. Place it at the top of the monthly notebook note view, only for notes that are monthly notes.
- Add a light overlay so text keeps 4.5:1 contrast. Use semantic and phase tokens only.
- Check at 390px and 1280px.
