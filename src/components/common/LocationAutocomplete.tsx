import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface Suggestion {
  text: string;
  secondary?: string;
}

export function LocationAutocomplete({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const sessionRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const p = loadGoogleMaps();
    if (!p) return;
    let cancelled = false;
    p.then(async (g: any) => {
      if (cancelled) return;
      const lib = await g.maps.importLibrary("places");
      placesLibRef.current = lib;
      sessionRef.current = new lib.AutocompleteSessionToken();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const lib = placesLibRef.current;
    const q = value.trim();
    if (!lib || q.length < 2) { setSuggestions([]); return; }
    if (q === lastQueryRef.current) return;
    lastQueryRef.current = q;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const { suggestions: res } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: sessionRef.current,
        });
        const out: Suggestion[] = (res ?? []).slice(0, 6).map((s: any) => {
          const p = s.placePrediction;
          return {
            text: p?.mainText?.text ?? p?.text?.text ?? "",
            secondary: p?.secondaryText?.text,
          };
        }).filter((s: Suggestion) => s.text);
        setSuggestions(out);
        setOpen(out.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [value]);

  const pick = (s: Suggestion) => {
    const full = s.secondary ? `${s.text}, ${s.secondary}` : s.text;
    onChange(full);
    setOpen(false);
    sessionRef.current = placesLibRef.current ? new placesLibRef.current.AutocompleteSessionToken() : null;
  };

  const useCurrent = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex items-center gap-2">
          <MapPin className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? "Search a place or address"}
            className="pl-8"
            onFocus={() => suggestions.length && setOpen(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={useCurrent}
            title="Use current location"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {suggestions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No matches</div>
        ) : suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(s)}
            className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <div className="truncate">{s.text}</div>
            {s.secondary && <div className="truncate text-xs text-muted-foreground">{s.secondary}</div>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}