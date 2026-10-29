import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { listMailReminders, mailReminderLabel, type MailReminder } from "@/lib/mail-inbox";

/** Today reminder for mail awaiting a review, a nearby bill/coupon date, or Trash about to be deleted. */
export function MailReminderCard() {
  const [items, setItems] = useState<MailReminder[]>([]);
  useEffect(() => { listMailReminders().then(setItems).catch(() => setItems([])); }, []);
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-accent bg-accent/20 p-3 text-sm">
      <Link to="/notes/mail" className="flex min-h-11 items-center gap-2 font-medium text-foreground">
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        <span>Mail to look at</span>
        <span className="ml-auto shrink-0 text-xs font-normal text-muted-foreground">
          {items.length} item{items.length > 1 ? "s" : ""} · open Mail
        </span>
      </Link>
      <ul>
        {items.slice(0, 4).map((r) => (
          <li key={r.doc.id}>
            <Link to={`/notes/mail?open=${r.doc.id}`} className="flex min-h-11 items-start gap-3 border-t border-accent/40 py-2">
              <span className="min-w-0 flex-1 break-words text-foreground">{r.doc.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{mailReminderLabel(r)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > 4 && (
        <Link to="/notes/mail" className="mt-1 block min-h-11 py-2 text-xs text-muted-foreground">
          + {items.length - 4} more in Mail
        </Link>
      )}
    </section>
  );
}
