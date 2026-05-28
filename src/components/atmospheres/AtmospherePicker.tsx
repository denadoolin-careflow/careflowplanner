import { useMemo, useState } from "react";
import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ATMOSPHERES, AtmosphereId, useAtmosphere, getAtmosphere } from "@/lib/atmospheres";
import { AtmosphereCard } from "./AtmosphereCard";
import { AutoSwitchConfig } from "./AutoSwitchConfig";
import { AtmosphereSettingsDialog } from "./AtmosphereSettingsDialog";
import { useStore } from "@/lib/store";
import { getSuggestions } from "@/lib/atmosphere-suggestions";

export function AtmospherePicker() {
  const { current, favorites, recent, auto, set, toggleFavorite, setAutoRules } = useAtmosphere();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [settingsFor, setSettingsFor] = useState<AtmosphereId | null>(null);
  const active = getAtmosphere(current);

  const suggestions = useMemo(() => getSuggestions({
    hour: new Date().getHours(),
    lowEnergy: state.settings.lowEnergyMode,
    current,
  }), [current, state.settings.lowEnergyMode, open]);

  const apply = (id: AtmosphereId) => set(id);

  const favList = ATMOSPHERES.filter(a => favorites.includes(a.id));
  const recentList = ATMOSPHERES.filter(a => recent.includes(a.id) && a.id !== current).slice(0, 4);

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Choose atmosphere"
              className="h-9 w-9 rounded-full"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Atmosphere · {active.name}</TooltipContent>
      </Tooltip>

      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Atmospheres
          </div>
          <DialogTitle className="font-display text-2xl font-semibold leading-tight">
            Choose the atmosphere that supports your day.
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            More than a color. Each atmosphere reshapes the mood, light, and rhythm of CareFlow.
          </p>
        </DialogHeader>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommended for now</h3>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map(s => {
                const atm = getAtmosphere(s.atmosphere);
                return (
                  <button
                    key={s.id}
                    onClick={() => apply(s.atmosphere)}
                    className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs transition hover:bg-primary/15"
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: atm.palette[0] }} />
                    <span>{s.message}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {favList.length > 0 && (
          <Section title="Favorites" icon={<Star className="h-3 w-3 fill-amber-300 text-amber-300" />}>
            <Grid items={favList} current={current} favorites={favorites} onApply={apply} onFav={toggleFavorite} onSettings={setSettingsFor} />
          </Section>
        )}

        <Section title="All atmospheres">
          <Grid items={ATMOSPHERES} current={current} favorites={favorites} onApply={apply} onFav={toggleFavorite} onSettings={setSettingsFor} />
        </Section>

        {recentList.length > 0 && (
          <Section title="Recently used">
            <Grid items={recentList} current={current} favorites={favorites} onApply={apply} onFav={toggleFavorite} onSettings={setSettingsFor} />
          </Section>
        )}

        <AutoSwitchConfig rules={auto} onChange={setAutoRules} />

        <p className="text-center text-[11px] text-muted-foreground">
          Atmospheres adapt to both light and dark mode automatically.
        </p>
      </DialogContent>
    </Dialog>
    {settingsFor && (
      <AtmosphereSettingsDialog
        atmosphere={getAtmosphere(settingsFor)}
        open={!!settingsFor}
        onOpenChange={(v) => { if (!v) setSettingsFor(null); }}
      />
    )}
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ items, current, favorites, onApply, onFav, onSettings }: {
  items: typeof ATMOSPHERES;
  current: AtmosphereId;
  favorites: AtmosphereId[];
  onApply: (id: AtmosphereId) => void;
  onFav: (id: AtmosphereId) => void;
  onSettings: (id: AtmosphereId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(a => (
        <AtmosphereCard
          key={a.id}
          atmosphere={a}
          isActive={a.id === current}
          isFavorite={favorites.includes(a.id)}
          onApply={onApply}
          onToggleFavorite={onFav}
          onOpenSettings={onSettings}
        />
      ))}
    </div>
  );
}