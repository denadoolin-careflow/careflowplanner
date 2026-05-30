/**
 * Service worker registration with strict guards so it never activates inside
 * Lovable's preview iframe (which would serve stale cached HTML).
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.endsWith("lovableproject.com") ||
    host.endsWith("lovableproject-dev.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    // Aggressively clean any previously registered worker so the preview
    // never gets locked to a stale shell.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    }).catch(() => {});
    return;
  }

  // Dynamic import keeps virtual:pwa-register out of the preview bundle path.
  import("virtual:pwa-register").then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        import("sonner").then(({ toast }) => {
          toast("New version available", {
            description: "Refresh to get the latest CareFlow.",
            action: { label: "Refresh", onClick: () => updateSW(true) },
            duration: 15000,
          });
        });
      },
      onOfflineReady() {
        import("sonner").then(({ toast }) => {
          toast.success("Ready to work offline");
        });
      },
    });
  }).catch(() => {});
}