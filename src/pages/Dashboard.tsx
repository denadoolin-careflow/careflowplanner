import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { EnergyCheckIn } from "@/components/cards/EnergyCheckIn";
import { format } from "date-fns";
import { CustomizableGrid } from "@/components/dashboard/CustomizableGrid";

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
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="cozy-card overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8 gradient-warm">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{greeting()}, {state.settings.name}.</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">A soft start. One thing at a time. You don't have to do it all today.</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] uppercase tracking-[0.22em] text-accent-foreground/70">Today</span>
              <div className="font-display text-3xl font-semibold tabular-nums tracking-tight text-accent-foreground sm:text-4xl">
                {format(now, "h:mm")}<span className="text-accent-foreground/50">:{format(now, "ss")}</span>
                <span className="ml-1 text-sm font-medium text-accent-foreground/60">{format(now, "a")}</span>
              </div>
              <span className="mt-0.5 text-[11px] font-medium text-accent-foreground/70">
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
