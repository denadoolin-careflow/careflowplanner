import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { toast } from "sonner";
import { natalSummary, type NatalSnapshot } from "@/lib/cosmic/natal";
import { Badge } from "@/components/ui/badge";

export default function CosmicFlowBirthChart() {
  const { row, loading, save, clear, natal } = useBirthChart();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setDate(row.birth_date ?? "");
      setTime(row.birth_time ?? "");
      setPlace(row.birth_place ?? "");
      setLat(row.birth_lat != null ? String(row.birth_lat) : "");
      setLng(row.birth_lng != null ? String(row.birth_lng) : "");
    }
  }, [row]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { toast.error("Birth date is required."); return; }
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await save({
        date,
        time: time || undefined,
        tz,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        place: place || undefined,
      });
      toast.success("Birth chart saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-3 pb-28 sm:p-6 sm:pb-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl">Birth Chart</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Add your birth info to personalize Cosmic Flow.</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/cosmic-flow" className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Dashboard</span></Link>
        </Button>
      </header>

      {natal && <NatalSummaryCard natal={natal} />}

      {row && (
        <div className="flex justify-end">
          <Button asChild size="sm" variant="secondary" className="gap-1.5">
            <Link to="/cosmic-flow/natal">
              <Sparkles className="h-3.5 w-3.5" />
              Open your interactive natal chart
            </Link>
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="cozy-card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="bd">Birth date</Label>
            <Input id="bd" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="bt">Birth time (optional)</Label>
            <Input id="bt" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="bp">Birth place</Label>
          <Input id="bp" value={place} onChange={e => setPlace(e.target.value)} placeholder="City, Country" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="blat">Latitude</Label>
            <Input id="blat" inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} placeholder="40.7128" />
          </div>
          <div>
            <Label htmlFor="blng">Longitude</Label>
            <Input id="blng" inputMode="decimal" value={lng} onChange={e => setLng(e.target.value)} placeholder="-74.0060" />
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Birth time and location are optional, but adding them lets us compute your rising sign.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="submit" disabled={busy || loading} className="w-full sm:w-auto">{busy ? "Saving…" : "Save birth chart"}</Button>
          {row && (
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={async () => { await clear(); toast("Birth chart removed"); }}>
              <Trash2 className="mr-1 h-4 w-4" />Remove
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function NatalSummaryCard({ natal }: { natal: NatalSnapshot }) {
  return (
    <section className="cozy-card p-5">
      <h3 className="font-display text-base">Your natal snapshot</h3>
      <p className="mt-1 text-sm text-muted-foreground">{natalSummary(natal)}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(natal.planets).map(([planet, sign]) => (
          <Badge key={planet} variant="outline" className="font-normal">{planet} in {sign}</Badge>
        ))}
      </div>
    </section>
  );
}