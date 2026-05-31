Add smooth, fast page transitions across the app so route changes feel seamless instead of blinking.

**Approach**

1. **Wrap `<Outlet />` with an animated transition layer** in `src/components/layout/AppLayout.tsx`:
   - Use `framer-motion`'s `AnimatePresence` + `motion.div` keyed by `pathname`.
   - Subtle, fast transition: 180ms ease-out, opacity 0→1 + 4px upward translate. No scale (avoids layout shift / blur). Respects `prefers-reduced-motion` and the app's existing `--anim-intensity` (skip animation when set to "calm/none").

2. **Eliminate the "blink" caused by remounts**:
   - Ensure the transition wrapper uses `mode="wait"` only if needed; default to `mode="popLayout"` so the incoming page fades in over the outgoing one (no white flash).
   - Use `will-change: opacity, transform` only during the animation.

3. **Speed up perceived load**:
   - Add `<ScrollRestoration>`-style instant scroll reset that runs *before* paint (already handled by `ScrollToTop`, just confirm it doesn't cause an extra frame).
   - Preload route chunks on hover/touchstart for `NavLink`s in `BottomNav` and `Sidebar` (call `import()` for the lazy route module). Since routes here are statically imported in `App.tsx`, this step is a no-op — note in the plan that no code-split exists, so navigation is already chunk-free; the only remaining cost is React re-render.

4. **Reduce re-render cost** on heavy pages by ensuring the transition wrapper doesn't force unnecessary remounts of providers (it lives inside `AppLayout`, below all providers — already correct).

**Files to edit**
- `src/components/layout/AppLayout.tsx` — wrap `<Outlet />` with `AnimatePresence` + `motion.div` keyed by `location.pathname`.
- `src/index.css` — add a tiny `.page-enter` helper if needed (optional; framer-motion handles inline).

**Out of scope**
- No route-level code splitting refactor.
- No changes to data fetching or stores.
- No visual redesign of pages themselves.

**Verification**
- Tap between bottom-nav tabs on mobile: pages should cross-fade in ~180ms with no white flash.
- Reduced-motion users see instant swap.
- No layout shift on header/bottom nav (they live outside the animated wrapper).