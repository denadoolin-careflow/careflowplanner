## Plan

1. **Remove the mobile overflow source**
   - Change the Today snapshot row from a fixed 3-column mobile grid into a wrapping centered layout so wide labels like “Steady” and “100%” cannot push the page sideways.
   - Add `min-w-0` / `max-w-full` safeguards to the row and chips.

2. **Keep Today content centered after data loads**
   - Add mobile-safe width constraints to the Today page container and main column so late-loading content like weather, routines, or side cards cannot expand beyond the viewport.
   - Ensure sidebar cards stack within the same centered width on phone sizes.

3. **Tighten risky child layouts**
   - Update weather and rhythm section inner rows to wrap/truncate safely on narrow screens.
   - Preserve the current desktop/tablet layout.

4. **Verify at phone widths**
   - Re-check `/today` at 360px and 390px after implementation.
   - Confirm there is no horizontal scroll and cards stay centered before reporting done.