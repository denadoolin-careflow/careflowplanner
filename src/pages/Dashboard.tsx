import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { format } from "date-fns";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";
import { PhaseBadge } from "@/components/cycle/PhaseBadge";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "It's late, friend";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Soft night";
}

export default function Dashboard() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col items-center gap-4 p-6 text-center gradient-warm sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:p-8 sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/80">{format(new Date(), "EEEE, MMMM d")}</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">{greeting()}, {state.settings.name}.</h2>
            <p className="mt-1 max-w-xl text-sm font-medium text-foreground/75">A soft start. One thing at a time. You don't have to do it all today.</p>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <button
                type="button"
                onClick={() => navigate("/cosmic-flow")}
                aria-label="Open Cosmic Flow — moon phase, sign, and transits"
                className="rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoonPhaseBadge />
              </button>
              <button
                type="button"
                onClick={() => navigate("/cosmic-flow")}
                aria-label="Open Cosmic Flow — element of the day"
                className="rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ElementBadge />
              </button>
              <PhaseBadge onClick={() => navigate("/cycle")} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-foreground/80">Today</span>
              <div className="font-display text-3xl font-light tabular-nums tracking-tight text-accent-foreground sm:text-4xl">
                {format(now, "h:mm")}<span className="text-accent-foreground/40">:{format(now, "ss")}</span>
                <span className="ml-1 text-sm font-normal text-accent-foreground/60">{format(now, "a")}</span>
              </div>
              <span className="mt-0.5 text-[11px] font-semibold text-accent-foreground/80">
                {format(now, "EEE, MMM d")}
              </span>
            </div>
            <EnergyCheckIn />
            {state.settings.lowEnergyMode && (
              <Badge className="rounded-full bg-moon-soft text-moon-foreground hover:bg-moon-soft">Low-energy mode on</Badge>
            )}
          </div>
        </div>
      </div>

      <CustomizableGrid pageKey="home" />
    </div>
  );
}
