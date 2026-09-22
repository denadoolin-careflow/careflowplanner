import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, Unplug } from "lucide-react";
import { clearGmailCooldown, gmailConnect, gmailDisconnect, gmailStatus, gmailSyncStarred, type GmailStatus } from "@/lib/gmail";

export function GmailSection() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setStatus(await gmailStatus()); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't check your Gmail connection"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev?.data?.type === "gmail-connected") { toast.success("Gmail connected."); refresh(); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [refresh]);

  const onConnect = async () => {
    try {
      const url = await gmailConnect(`${window.location.origin}/gmail/callback`);
      const w = window.open(url, "gmail-oauth", "width=520,height=700");
      if (!w) window.location.href = url;
    } catch (e: any) { toast.error(e?.message ?? "Couldn't start sign-in"); }
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      const r = await gmailSyncStarred();
      clearGmailCooldown();
      toast.success(r.imported ? `Added ${r.imported} starred email${r.imported === 1 ? "" : "s"} to your inbox.` : "No new starred emails.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Sync failed."); }
    finally { setSyncing(false); }
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect Gmail? Starred emails will stop coming in.")) return;
    try { await gmailDisconnect(); toast.success("Disconnected."); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Failed."); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  if (!status?.connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect your own Gmail and every email you star becomes a task in your inbox, with a link straight back to the email.
        </p>
        <Button onClick={onConnect} className="rounded-full"><Mail className="mr-2 h-4 w-4" /> Connect Gmail</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm">
        <p className="font-medium">{status.email ?? "Gmail connected"}</p>
        <p className="text-muted-foreground">
          Starred emails arrive in your inbox automatically.
          {status.lastSyncedAt ? ` Last checked ${new Date(status.lastSyncedAt).toLocaleString()}.` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSync} disabled={syncing} className="h-8 rounded-full">
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Checking…" : "Check now"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDisconnect} className="h-8 rounded-full">
          <Unplug className="mr-1 h-3.5 w-3.5" /> Disconnect
        </Button>
      </div>
    </div>
  );
}
