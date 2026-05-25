/** Time-of-day greeting. Returns a soft, on-brand salutation. */
export function timeOfDayGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "It's late, friend";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Soft night";
}

/** Greeting with optional name, gracefully omits punctuation when nameless. */
export function personalGreeting(name?: string | null, now: Date = new Date()): string {
  const g = timeOfDayGreeting(now);
  const trimmed = (name ?? "").trim();
  return trimmed ? `${g}, ${trimmed}.` : `${g}.`;
}