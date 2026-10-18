# Richer Day rhythm card + eight new seasonal atmospheres

## 1. Day rhythm card (Planner)
Right now the closed card says only "Moon · season · cycle · capacity" and shows a capacity bar. You have to open it to see anything useful.

- **Closed state shows real info:** small chips for the moon phase and sign, the season, the cycle phase (when you track a cycle), and a capacity ring with planned vs. available time.
- **Phase color:** a thin band on the card's edge in the day's CareFlow rhythm color (Plan / Grow / Care / Let go), using the existing phase colors.
- **One-line guidance:** a short "Today favors…" line that combines the moon and cycle phases (for example "Gentle start — good for planning and light care").
- **Open state:** the four sections become tabs (Moon, Season, Cycle, Capacity) instead of one long stack. The app remembers the last tab you picked.
- **Open or closed is remembered** on this device, so the card stays the way you left it.
- **Phones:** chips scroll sideways, and every tap target is at least 44px.

## 2. Two new atmospheres per season
Each one gets a full light and dark color set, a font pair already in use, and a preview card in the atmosphere picker under its season.

| Season | New atmosphere | Feel |
| --- | --- | --- |
| Spring | Tulip Garden | Fresh pinks, leaf green, morning light |
| Spring | Rain Garden | Cool slate, moss, wet stone |
| Summer | Lemon Grove | Sunny citrus, white linen, olive |
| Summer | Firefly Nights | Deep indigo, warm glow, starlight (dark) |
| Fall | Apple Orchard | Red apples, crisp green, wooden crates |
| Fall | Pumpkin Patch | Pumpkin orange, hay gold, dusk brown |
| Winter | Christmas Time | Holly red, pine green, gold twinkle lights |
| Winter | Cocoa & Quilts | Hot cocoa browns, cream, plaid red |

Fall already has "Amber Orchard" (cider on the porch). Apple Orchard is a separate, brighter red-and-green look.

## Technical details
- Rhythm card: rewrite `src/components/planner/PlannerDayRhythm.tsx`. Reuse `PlannerMoonInsight`, `SolarSeasonGuide`, `CyclePlanningGuide` and `PlannerCapacityBar` for the tab content, plus the existing moon, season and cycle helpers for the chips. Store the open state and last tab in localStorage, which fits the existing rule that planner rhythm display settings stay on the device.
- Atmospheres: add 8 ids to `AtmosphereId` and `ATMOSPHERES`, add them to the season lists in `SEASONS` (`src/lib/atmospheres.ts`), and add `:root[data-atmosphere=…]` and `.dark[data-atmosphere=…]` token blocks to `src/index.css` following the existing pattern. Colors use semantic HSL tokens only.
- Add a test that checks every atmosphere id has a palette and belongs to a season.
- No changes to the database.
