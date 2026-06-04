import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoonPhaseBadge } from "@/components/rhythm/MoonPhaseBadge";
import { ElementBadge } from "@/components/rhythm/ElementBadge";
import { getMoonData } from "@/lib/moon-providers";
import { MOON_GUIDANCE, getElementMeta, getElementRecommendation } from "@/lib/rhythm-forecast";
import { ATMOSPHERES, useAtmosphere, getAtmosphere, type AtmosphereId } from "@/lib/atmospheres";
import { getSuggestions } from "@/lib/atmosphere-suggestions";
import { useStore } from "@/lib/store";
import { AtmospherePicker } from "@/components/atmospheres/AtmospherePicker";
import { cn } from "@/lib/utils";
import { Sparkles, Check, Star } from "lucide-react";

/** Clickable moon-phase chip — popover shows phase guidance for the day. */
export function MoonPhaseChip({ date }: { date: Date }) {
  const moon = getMoonData(date);
  const guidance = MOON_GUIDANCE[moon.phase];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring/40">
          <MoonPhaseBadge date={date} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>{moon.glyph}</span>
          <div>
            <div className="font-display text-base leading-tight">{guidance?.short ?? moon.label}</div>
            <div className="text-[11px] text-muted-foreground">{guidance?.keywords.join(" · ")}</div>
          </div>
        </div>
        {guidance && (
          <>
            <p className="text-sm italic text-foreground/80">"{guidance.suggestion}"</p>
            <div className="space-y-1 text-xs">
              <div><span className="font-medium text-foreground">Do more:</span> <span className="text-muted-foreground">{guidance.doMore.join(", ")}</span></div>
              <div><span className="font-medium text-foreground">Do less:</span> <span className="text-muted-foreground">{guidance.doLess.join(", ")}</span></div>
            </div>
            <p className="rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">🤲 {guidance.caregiverNote}</p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Clickable seasonal-energy chip — popover shows element + recommendation. */
export function ElementChip({ date }: { date: Date }) {
  const meta = getElementMeta(date);
  const recommendation = getElementRecommendation(date);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring/40">
          <ElementBadge date={date} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Seasonal Energy</div>
        <div className="font-display text-base">{meta.label} · <span className="text-muted-foreground">{meta.verb}</span></div>
        <p className="text-sm text-foreground/80">{recommendation}</p>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
          <ElementBadge date={date} variant="tile" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Clickable atmosphere chip — popover for quick switch + opens full picker. */
export function AtmosphereChip() {
  const { atmosphere, current, set, favorites, recent } = useAtmosphere();
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const suggestions = getSuggestions({
    hour: new Date().getHours(),
    lowEnergy: state.settings?.lowEnergyMode,
    current,
  }).slice(0, 3);

  const favList = ATMOSPHERES.filter(a => favorites.includes(a.id));
  const recentList = ATMOSPHERES.filter(a => recent.includes(a.id) && a.id !== current).slice(0, 4);

  const apply = (id: AtmosphereId) => { set(id); setOpen(false); };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-2.5 py-1 text-[11px] transition-colors hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
            title={atmosphere.tagline}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: atmosphere.palette?.[0] ?? "currentColor" }}
            />
            <span aria-hidden>🪐</span>
            <span className="font-medium">{atmosphere.name}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Current Atmosphere</div>
            <div className="font-display text-base">{atmosphere.name}</div>
            <p className="text-xs italic text-muted-foreground">{atmosphere.tagline}</p>
          </div>

          {suggestions.length > 0 && (
            <ChipRow title="Suggested for now" items={suggestions.map(s => ({ id: s.atmosphere, label: getAtmosphere(s.atmosphere).name }))} active={current} onPick={apply} />
          )}
          {favList.length > 0 && (
            <ChipRow title="Favorites" items={favList.map(a => ({ id: a.id, label: a.name }))} active={current} onPick={apply} icon={<Star className="h-3 w-3 fill-amber-300 text-amber-300" />} />
          )}
          {recentList.length > 0 && (
            <ChipRow title="Recent" items={recentList.map(a => ({ id: a.id, label: a.name }))} active={current} onPick={apply} />
          )}
          <ChipRow title="All" items={ATMOSPHERES.map(a => ({ id: a.id, label: a.name }))} active={current} onPick={apply} />

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center rounded-xl text-xs"
            onClick={() => { setOpen(false); setPickerOpen(true); }}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Open atmosphere picker
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-0">
          <DialogHeader className="sr-only"><DialogTitle>Atmospheres</DialogTitle></DialogHeader>
          <div className="p-6"><AtmospherePicker /></div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChipRow({
  title, items, active, onPick, icon,
}: {
  title: string;
  items: { id: AtmosphereId; label: string }[];
  active: AtmosphereId;
  onPick: (id: AtmosphereId) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(it => {
          const atm = getAtmosphere(it.id);
          const isActive = it.id === active;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onPick(it.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors",
                isActive ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 bg-card/60 hover:bg-muted/50",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: atm.palette[0] }} />
              <span>{it.label}</span>
              {isActive && <Check className="h-3 w-3 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}