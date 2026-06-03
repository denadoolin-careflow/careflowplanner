export type HomeHubTabId = "dashboard" | "rhythm" | "reset" | "zones" | "maintenance" | "analytics";

const KEY = "careflow:home-hub-default-tab";

export function getDefaultHomeHubTab(): HomeHubTabId {
  if (typeof window === "undefined") return "dashboard";
  const v = window.localStorage.getItem(KEY) as HomeHubTabId | null;
  return v ?? "dashboard";
}

export function setDefaultHomeHubTab(tab: HomeHubTabId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, tab);
}
