# Day Flow, steady day taps, live moon, richer guidance

## 1. Bring back Day Flow
- When the Planner's Day view is embedded, the Today layout picker (Day Flow / Phase Tabs / Quadrants / Plan / Board) doesn't show. Add it back as a small pill choice in the Day view header. Day Flow becomes the default again, and your saved choice is kept.
- Day Flow keeps its three columns: Arrive & Focus on the left, Your day in the middle, Rhythms on the right.

## 2. Picking a day no longer jumps down the page
- First, find out what scrolls the page when you tap a day in the week strip. The likely causes are the timeline snapping to "now" or a #slot hash in the address. This hasn't been confirmed yet.
- Fix: picking a day keeps the page where it is. The timeline can still jump to "now" inside its own box, but only the first time it opens on today.

## 3. Moon and guidance follow the date and the phase you tap
- **Changing the date:** the moon picture, sky photo, "Waning Crescent in Libra" line, NOW badge and Today's guidance all update to the chosen day. This already partly works and will be checked for every way of changing the date.
- **Tapping Plan / Grow / Care / Let go:** shows a preview of that phase. The moon picture turns to that phase's shape, the sky photo and colors change, and the guidance card shows that phase's advice. A small "Back to today" chip returns to the real phase. A second link, "Jump to next Plan day", moves the date to the next day in that phase. The short popover goes away, and its content moves into the guidance card.

## 4. Clearer astrological advice without repeats
- Write a short brief for each of the 12 Moon signs. Each gets its own focus (body, home, money, communication and so on) and best uses, such as "Libra: settle shared plans, send the hard email gently, rebalance chores".
- Write one line for every phase × sign pair: 48 different, concrete sentences. Today's single template, "Let go in Libra: clear what's finished… and seek balance…", goes away.
- The three action chips come from that phase × sign pair, so they never repeat the summary sentence. The affirmation changes by sign too.
- A check makes sure no two of the 48 sentences are the same and the chips never repeat the headline.

## Technical details
- `src/lib/cosmic/moon-energy.ts`: add a `PHASE_SIGN_GUIDE[phase][sign] = { line, actions[3], affirmation }` table; `phaseSignAdvice` reads from it (shared by Moonscape and Year view).
- `TodayMoonHeader.tsx`: local `previewPhase` state; RealMoon draws a representative moon age for that phase; the guidance card reads from the new table.
- `Today.tsx`/`Planner.tsx`: show the layout pills when embedded; stop `scrollIntoView` from firing on a date change and limit `scrollToNow` to the timeline box.
- New test: `moon-energy.test.ts` checks that the sentences are unique and every one is filled in.
