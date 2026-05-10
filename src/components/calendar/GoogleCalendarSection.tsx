import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { gcalConnect, gcalDisconnect, gcalListCalendars, gcalSaveSelections, type GCalCalendar } from "@/lib/google-calendar";

export function GoogleCalendarSection() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [calendars, setCalendars] = useState<GCalCalendar[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await gcalListCalendars();
      setConnected(r.connected);
      setCalendars(r.calendars ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load Google calendars");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev?.data?.type === "google-calendar-connected") {
        toast.success("Google Calendar connected.");
        refresh();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [refresh]);

  const onConnect = async () => {
    try {
      const url = await gcalConnect();
      const w = window.open(url, "gcal-oauth", "width=520,height=700,noopener=no");
      if (!w) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't start sign-in");
    }
  };

  const onDisconnect = async () => {
    if (!confirm("Disconnect Google Calendar? Your selections will be cleared.")) return;
    try {
      await gcalDisconnect();
      toast.success("Disconnected.");
      setConnected(false); setCalendars([]);
    } catch (e: any) { toast.error(e?.message ?? "Failed."); }
  };

  const toggle = (id: string, enabled: boolean) => {
    setCalendars(cs => cs.map(c => c.id === id ? { ...c, enabled } : c));
  };

  const save = async () => {
    setSaving(true);
    try {
      await gcalSaveSelections(calendars);
      toast.success("Calendar selection saved.");
    } catch (e: any) { toast.error(e?.message ?? "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Bring your Google calendars into the app — read-only and color-coded.</p>
        <Button onClick={onConnect} className="rounded-full">Connect Google Calendar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Choose which calendars appear:</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={refresh} className="h-8 rounded-full"><RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" variant="outline" onClick={onDisconnect} className="h-8 rounded-full"><Unplug className="mr-1 h-3.5 w-3.5" /> Disconnect</Button>
        </div>
      </div>
      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
        {calendars.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No calendars found.</li>}
        {calendars.map(c => (
          <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color ?? "hsl(var(--muted))" }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.summary}{c.primary && <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">primary</span>}</div>
              <div className="truncate text-[11px] text-muted-foreground">{c.id}</div>
            </div>
            <Switch checked={c.enabled} onCheckedChange={(v) => toggle(c.id, v)} />
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-full">{saving ? "Saving…" : "Save selection"}</Button>
      </div>
    </div>
  );
}