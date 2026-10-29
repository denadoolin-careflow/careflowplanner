import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock } from "lucide-react";
import { type CabinetDoc, daysUntilExpiry, listDocs, needsExpiryReminder } from "@/lib/filing-cabinet";

/** Today reminder for Filing Cabinet documents nearing their expiry/renewal date. */
export function CabinetExpiryCard() {
  const [docs, setDocs] = useState<CabinetDoc[]>([]);
  useEffect(() => { listDocs().then((d) => setDocs(d.filter((x) => needsExpiryReminder(x)))).catch(() => setDocs([])); }, []);
  if (!docs.length) return null;
  return (
    <Link to="/notes/cabinet" className="flex min-h-11 items-start gap-3 rounded-2xl border border-accent bg-accent/20 p-3 text-sm">
      <AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">Documents to renew</p>
        <ul className="text-muted-foreground">
          {docs.slice(0, 3).map((d) => {
            const n = daysUntilExpiry(d.expires_at)!;
            return <li key={d.id} className="break-words">{d.title} — {n < 0 ? "expired" : n === 0 ? "today" : `in ${n} day${n > 1 ? "s" : ""}`}</li>;
          })}
        </ul>
      </div>
    </Link>
  );
}
