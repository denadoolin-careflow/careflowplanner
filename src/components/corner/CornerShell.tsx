import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CareFlowMark } from "@/components/widgets/CareFlowMark";

/** Simple public header/footer for the Corner and Shop pages. */
export function CornerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/landing" className="flex items-center gap-2">
            <CareFlowMark size={32} />
            <span className="font-display text-xl text-foreground">CareFlow</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-foreground/80">
            <Link to="/corner" className="min-h-11 content-center hover:text-primary">Corner</Link>
            <Link to="/shop" className="min-h-11 content-center hover:text-primary">Shop</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">{children}</main>
    </div>
  );
}
