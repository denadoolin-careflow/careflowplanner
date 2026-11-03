import type { ReactNode } from "react";

/**
 * Lays out Today's dashboard cards in as many columns as the space they
 * actually have. The desktop "Your day" column is much narrower than the
 * window, so window-based breakpoints would squeeze the cards past overlap.
 */
export function PhaseCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="phase-card-grid">
      <div className="phase-card-cols">{children}</div>
    </div>
  );
}
