import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps } from "@/lib/trips/maps-loader";
import { Loader2 } from "lucide-react";

export interface PlaceSelection {
  placeId: string;
  description: string;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search place...",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: PlaceSelection) => void;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const tokenRef = useRef<any>(null);
  const debRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
    };
  }, []);

  async function query(input: string) {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const google = await loadGoogleMaps();
      const { AutocompleteSuggestion, AutocompleteSessionToken } =
        await google.maps.importLibrary("places");
      if (!tokenRef.current) tokenRef.current = new AutocompleteSessionToken();
      const { suggestions: sg } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: tokenRef.current,
      });
      setSuggestions(
        (sg ?? [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({ placeId: p.placeId, text: p.text?.text ?? "" })),
      );
      setOpen(true);
    } catch (e) {
      console.error("autocomplete error", e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(v: string) {
    onChange(v);
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => query(v), 250);
  }

  function pick(s: { placeId: string; text: string }) {
    onChange(s.text);
    onSelect({ placeId: s.placeId, description: s.text });
    setOpen(false);
    setSuggestions([]);
    tokenRef.current = null;
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
            >
              {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}