import { SlotWeather } from "@/components/today/rhythm/SlotWeather";

/**
 * Persistent morning/afternoon/evening weather strip shown directly
 * under the Moon · Energy · Cycle triptych on every planning page.
 */
export function SlotWeatherStrip() {
  return (
    <section className="-mx-4 grid gap-2 sm:mx-0 sm:grid-cols-3 sm:gap-3">
      <div><SlotWeather slot="morning" /></div>
      <div><SlotWeather slot="afternoon" /></div>
      <div><SlotWeather slot="evening" /></div>
    </section>
  );
}