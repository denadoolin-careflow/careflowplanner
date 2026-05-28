import { useEffect, useState } from "react";
import { Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { TripCard } from "@/components/trips/TripCard";
import { NewTripDialog } from "@/components/trips/NewTripDialog";
import { listTrips, type Trip, type TripStatus } from "@/lib/trips/api";
import { toast } from "sonner";

const STATUS_TABS: { id: "all" | TripStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "planning", label: "Planning" },
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [tab, setTab] = useState<"all" | TripStatus>("all");

  async function load() {
    setLoading(true);
    try {
      setTrips(await listTrips());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = tab === "all" ? trips : trips.filter(t => t.status === tab);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">Plan getaways, build itineraries, pack with confidence.</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-1.5 h-4 w-4" />New trip
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map(t => {
          const count = t.id === "all" ? trips.length : trips.filter(x => x.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                tab === t.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {t.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <SectionCard accent="calm" title={tab === "all" ? "All trips" : STATUS_TABS.find(s => s.id === tab)?.label}>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading trips…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Plane}
            title={trips.length === 0 ? "No trips yet" : "Nothing here"}
            description={
              trips.length === 0
                ? "Start planning your next adventure — destinations, itinerary, places to see, and a packing list."
                : "Try another tab or create a new trip."
            }
            action={
              <Button onClick={() => setOpenNew(true)}>
                <Plus className="mr-1.5 h-4 w-4" />New trip
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </SectionCard>

      <NewTripDialog open={openNew} onOpenChange={(v) => { setOpenNew(v); if (!v) load(); }} />
    </div>
  );
}