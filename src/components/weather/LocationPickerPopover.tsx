import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Search, LocateFixed, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchWeather, geocodeCity, loadSavedPlace, reverseLabel, savePlace,
  type GeoPlace,
} from "@/lib/weather";
import { setWeatherSnapshot } from "@/lib/weather-store";
import { toast } from "sonner";

const STORE_KEY = "careflow:weather:place";

interface Props {
  label?: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function LocationPickerPopover({ label, trigger, className }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const saved = loadSavedPlace();
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    if (!q.trim()) { setResults([]); return; }
    tRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocodeCity(q.trim());
        setResults(r);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (tRef.current) window.clearTimeout(tRef.current); };
  }, [q]);

  const apply = async (place: GeoPlace) => {
    try {
      savePlace(place);
      const snap = await fetchWeather(place.lat, place.lon, place.name);
      setWeatherSnapshot(snap);
      toast.success(`Weather set to ${place.name}`);
      setOpen(false);
      setQ("");
      setResults([]);
    } catch {
      toast.error("Couldn't load weather for that place.");
    }
  };

  const useCurrent = () => {
    if (!("geolocation" in navigator)) { toast.error("Geolocation not available."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lbl = await reverseLabel(pos.coords.latitude, pos.coords.longitude);
          await apply({ name: lbl, lat: pos.coords.latitude, lon: pos.coords.longitude });
        } finally { setLocating(false); }
      },
      () => { setLocating(false); toast.error("Location permission denied."); },
      { timeout: 7000 },
    );
  };

  const clearSaved = () => {
    try { localStorage.removeItem(STORE_KEY); } catch { /* noop */ }
    toast.message("Saved location cleared.");
    setOpen(false);
  };

  const triggerEl = trigger ?? (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/40 px-2 py-1 text-[11px] text-foreground/85 hover:bg-muted/70 transition",
        className,
      )}
    >
      <MapPin className="h-3 w-3" />
      <span className="max-w-[140px] truncate">{label ?? saved?.name ?? "Set location"}</span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerEl}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="City or ZIP"
            className="h-8 pl-7 text-sm"
            autoFocus
          />
        </div>
        <div className="mt-2 max-h-56 overflow-y-auto">
          {searching && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching…
            </div>
          )}
          {!searching && q && results.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No matches</div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lon},${i}`}
              type="button"
              onClick={() => apply(r)}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <div className="truncate">{r.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {[r.admin1, r.country].filter(Boolean).join(", ")}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 border-t border-border/40 pt-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={useCurrent} disabled={locating}>
            {locating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <LocateFixed className="mr-1 h-3 w-3" />}
            Current
          </Button>
          {saved && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-muted-foreground" onClick={clearSaved}>
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}