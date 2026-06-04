import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MoonPhaseWidget } from "@/components/widgets/MoonPhaseWidget";

export function MoonPhaseSidebarCard() {
  return (
    <div className="group relative">
      <MoonPhaseWidget compact />
      <Link
        to="/rhythm"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        aria-label="Open lunar rhythm page"
      >
        Rhythm <ArrowRight className="h-2.5 w-2.5" />
      </Link>
    </div>
  );
}