import { SectionCard } from "@/components/cards/SectionCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useWeatherPrefs } from "@/lib/weather-prefs";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { reverseLabel, savePlace, loadSavedPlace } from "@/lib/weather";
import { toast } from "sonner";
import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

export function WeatherPrefsSection() {
  const [prefs, setPrefs] = useWeatherPrefs();
  const [unit, setUnit] = useTempUnit();
  const [locating, setLocating] = useState(false);
  const saved = loadSavedPlace();

  const fmt = (c: number) => unit === "F" ? `${cToF(c)}°F` : `${Math.round(c)}°C`;

  const detect = () => {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not available."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const label = await reverseLabel(pos.coords.latitude, pos.coords.longitude);
          savePlace({ name: label, lat: pos.coords.latitude, lon: pos.coords.longitude });
          toast.success(`Saved location: ${label}`);
        } catch { toast.error("Couldn't save location."); }
        finally { setLocating(false); }
      },
      () => { setLocating(false); toast.error("Location permission denied."); },
      { timeout: 7000 },
    );
  };

  return (
    <SectionCard title="Weather & rhythm" subtitle="Tune your daily guidance." accent="sage">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="text-sm">Saved location</Label>
            <p className="text-[11.5px] text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {saved?.name ?? "Not set"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={detect} disabled={locating}>
            {locating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <MapPin className="mr-1 h-3.5 w-3.5" />}
            Use my location
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm">Temperature unit</Label>
            <p className="text-[11.5px] text-muted-foreground">Used across the app.</p>
          </div>
          <div className="inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5">
            {(["C", "F"] as const).map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                className={`h-7 min-w-[32px] rounded-full px-2.5 text-[11px] font-semibold transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                °{u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Cold threshold</Label>
            <span className="text-[12px] tabular-nums text-muted-foreground">{fmt(prefs.coldC)}</span>
          </div>
          <p className="mb-2 text-[11.5px] text-muted-foreground">Below this, we'll suggest a jacket sooner.</p>
          <Slider value={[prefs.coldC]} min={-5} max={22} step={1} onValueChange={(v) => setPrefs({ coldC: v[0] })} />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Hot threshold</Label>
            <span className="text-[12px] tabular-nums text-muted-foreground">{fmt(prefs.hotC)}</span>
          </div>
          <p className="mb-2 text-[11.5px] text-muted-foreground">At or above, we'll suggest light clothes & water.</p>
          <Slider value={[prefs.hotC]} min={20} max={38} step={1} onValueChange={(v) => setPrefs({ hotC: v[0] })} />
        </div>

        <div className="space-y-2">
          <Row label="Rain alerts" desc="Umbrella & rain-boot suggestions." checked={prefs.rainAlerts} onChange={(v) => setPrefs({ rainAlerts: v })} />
          <Row label="Snow alerts" desc="Warmer boots & slow steps." checked={prefs.snowAlerts} onChange={(v) => setPrefs({ snowAlerts: v })} />
          <Row label="Wind / storm alerts" desc="Indoor-friendly day suggestions." checked={prefs.windAlerts} onChange={(v) => setPrefs({ windAlerts: v })} />
          <Row label="Auto-detect location" desc="Try geolocation on first load." checked={prefs.autoLocate} onChange={(v) => setPrefs({ autoLocate: v })} />
        </div>
      </div>
    </SectionCard>
  );
}

function Row({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label className="text-sm">{label}</Label>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}