/** Time-of-day greeting. Returns a soft, on-brand salutation (never includes a name). */
export function timeOfDayGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "It's late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Soft night";
}

/**
 * Resolve a real display name. Signup seeds `profiles.name` from the email
 * local-part, so a name matching that is treated as unset.
 */
export function resolveDisplayName(name?: string | null, email?: string | null): string | null {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;
  const local = (email ?? "").split("@")[0]?.trim().toLowerCase();
  if (local && trimmed.toLowerCase() === local) return null;
  return trimmed;
}

/** Greeting with optional name, gracefully omits punctuation when nameless. */
export function personalGreeting(name?: string | null, now: Date = new Date()): string {
  const g = timeOfDayGreeting(now);
  const trimmed = (name ?? "").trim();
  return trimmed ? `${g}, ${trimmed}.` : `${g}.`;
}