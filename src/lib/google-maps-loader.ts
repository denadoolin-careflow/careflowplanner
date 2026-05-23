let loaderPromise: Promise<any> | null = null;

/**
 * Lazily load the Google Maps JS API using the Lovable-managed browser key.
 * Returns null if no browser key is configured.
 */
export function loadGoogleMaps(): Promise<any> | null {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  if (!key) return null;
  if (typeof window === "undefined") return null;
  if ((window as any).google?.maps?.importLibrary) return Promise.resolve((window as any).google);
  if (loaderPromise) return loaderPromise;

  const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ?? "";
  loaderPromise = new Promise((resolve, reject) => {
    (window as any).__lovableInitMaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.async = true;
    s.defer = true;
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__lovableInitMaps",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
  return loaderPromise;
}