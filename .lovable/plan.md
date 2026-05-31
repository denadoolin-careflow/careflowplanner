Move swipe gesture handling from the global window (`SwipeNav`) into the BottomNav component so swipes only navigate between tabs when initiated on the bottom nav bar itself.

**Changes:**
1. `src/App.tsx` — remove `<SwipeNav />` from the router tree.
2. `src/components/layout/SwipeNav.tsx` — delete (no longer needed).
3. `src/components/layout/BottomNav.tsx` — add touchstart/touchend listeners directly on the `<nav>` element to handle left/right swipes between primary nav destinations, reusing the same haptics and order logic from the old SwipeNav.