import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { gmailBackgroundSync } from "@/lib/gmail";
import { useStore } from "@/lib/store";

/**
 * Quietly checks Gmail for newly starred emails when the app opens,
 * at most once every 10 minutes (cooldown lives in src/lib/gmail.ts).
 */
export function GmailBackgroundSync() {
  const { reloadAll } = useStore();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const t = setTimeout(() => {
      gmailBackgroundSync().then((imported) => {
        if (imported && imported > 0) {
          toast.success(`${imported} starred email${imported === 1 ? "" : "s"} added to your inbox.`);
          reloadAll();
        }
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [reloadAll]);

  return null;
}
