import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AstroPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon"><Link to="/cosmic-flow" aria-label="Back to Cosmic Flow"><ArrowLeft className="h-4 w-4" /></Link></Button>
      <div>
        <h1 className="font-display text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}

export function NeedsChart() {
  return (
    <div className="cozy-card p-5 text-sm">
      <p className="font-medium">Add your birth details to use this view.</p>
      <Button asChild size="sm" className="mt-3"><Link to="/cosmic-flow/birth-chart">Add birth chart</Link></Button>
    </div>
  );
}
