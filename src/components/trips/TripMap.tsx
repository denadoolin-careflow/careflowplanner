import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/trips/maps-loader";
import type { ItineraryItem, TripPlace } from "@/lib/trips/api";

const CATEGORY_COLORS: Record<string, string> = {
  eat: "#f59e0b",
  see: "#3b82f6",
  do: "#10b981",
  stay: "#a855f7",
  travel: "#64748b",
  other: "#64748b",
};

export function TripMap({
  itinerary,
  places,
}: {
  itinerary: ItineraryItem[];
  places: TripPlace[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((google) => {
      if (cancelled || !ref.current) return;
      const allPins = [
        ...itinerary.filter((i) => i.lat != null && i.lng != null).map((i) => ({
          lat: i.lat!,
          lng: i.lng!,
          title: i.title,
          category: i.category,
        })),
        ...places.filter((p) => p.lat != null && p.lng != null).map((p) => ({
          lat: p.lat!,
          lng: p.lng!,
          title: p.name,
          category: p.category,
        })),
      ];

      const center = allPins[0] ?? { lat: 20, lng: 0 };
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(ref.current, {
          center,
          zoom: allPins.length ? 11 : 2,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
      }

      // clear old markers
      const map = mapRef.current;
      (map.__markers ?? []).forEach((m: any) => m.setMap(null));
      const markers: any[] = [];
      const bounds = new google.maps.LatLngBounds();
      allPins.forEach((p) => {
        const m = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: p.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.other,
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
        markers.push(m);
        bounds.extend({ lat: p.lat, lng: p.lng });
      });
      map.__markers = markers;
      if (allPins.length > 1) map.fitBounds(bounds, 60);
      else if (allPins.length === 1) map.setCenter(allPins[0]);
    }).catch((e) => console.error("map load failed", e));
    return () => { cancelled = true; };
  }, [itinerary, places]);

  return (
    <div className="space-y-3">
      <div ref={ref} className="w-full h-[60vh] rounded-lg border bg-muted" />
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 capitalize">
            <span className="w-3 h-3 rounded-full border border-background" style={{ background: color }} />
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
}