import { format } from "date-fns";

/** ISO timestamp → value for an <input type="datetime-local"> in local time. */
export const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

/** datetime-local value → ISO; null when invalid or in the future. */
export function fromLocalInput(value: string, now = new Date()): string | null {
  const d = new Date(value);
  if (!value || isNaN(d.getTime()) || d.getTime() > now.getTime() + 60000) return null;
  return d.toISOString();
}
