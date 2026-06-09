import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft, Calendar, MapPin, Edit3, Trash2, Save, X, Users, StickyNote, Plane,
  ClipboardList, RefreshCw, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionCard } from "@/components/cards/SectionCard";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TripItinerary } from "@/components/trips/TripItinerary";
import { TripMap } from "@/components/trips/TripMap";
import { TripPlaces } from "@/components/trips/TripPlaces";
import { TripPacking } from "@/components/trips/TripPacking";
import {
  getTrip, updateTrip, deleteTrip,
  listItinerary, listPlaces, listPacking,
  type Trip, type TripStatus, type ItineraryItem, type TripPlace, type PackingItem,
} from "@/lib/trips/api";
import { toast } from "sonner";

const STATUSES: TripStatus[] = ["planning", "upcoming", "active", "completed"];

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [places, setPlaces] = useState<TripPlace[]>([]);
  const [packing, setPacking] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Trip>>({});

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const [t, it, pl, pk] = await Promise.all([
        getTrip(id), listItinerary(id), listPlaces(id), listPacking(id),
      ]);
      setTrip(t);
      setForm(t);
      setItinerary(it);
      setPlaces(pl);
      setPacking(pk);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id]);

  const reloadItinerary = async () => { if (id) setItinerary(await listItinerary(id)); };
  const reloadPlaces = async () => { if (id) setPlaces(await listPlaces(id)); };
  const reloadPacking = async () => { if (id) setPacking(await listPacking(id)); };

  async function saveEdits() {
    if (!trip) return;
    try {
      await updateTrip(trip.id, {
        title: form.title,
        destination: form.destination,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes,
        status: form.status as TripStatus,
      });
      toast.success("Trip updated");
      setEditing(false);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    }
  }

  async function onDelete() {
    if (!trip) return;
    try {
      await deleteTrip(trip.id);
      toast.success("Trip deleted");
      navigate("/trips");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl p-6 text-sm text-muted-foreground">Loading trip…</div>;
  }
  if (!trip) {
    return (
      <div className="mx-auto max-w-6xl p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Trip not found.</p>
        <Button asChild variant="outline" size="sm"><Link to="/trips"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to trips</Link></Button>
      </div>
    );
  }

  const dateLabel =
    trip.start_date && trip.end_date
      ? `${format(new Date(trip.start_date), "MMM d")} – ${format(new Date(trip.end_date), "MMM d, yyyy")}`
      : trip.start_date
        ? format(new Date(trip.start_date), "MMM d, yyyy")
        : "Dates TBD";

  const packedCount = packing.filter(p => p.packed).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/trips"><ArrowLeft className="mr-1.5 h-4 w-4" />All trips</Link>
        </Button>
        <div className="flex items-center gap-1.5">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm(trip); }}>
                <X className="mr-1.5 h-3.5 w-3.5" />Cancel
              </Button>
              <Button size="sm" onClick={saveEdits}>
                <Save className="mr-1.5 h-3.5 w-3.5" />Save
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the trip and all its itinerary, places, and packing list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <SectionCard accent="calm">
        {!editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{trip.title}</h1>
              <Badge variant="secondary" className="capitalize">{trip.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {trip.destination && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{trip.destination}</span>}
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{dateLabel}</span>
              {trip.travelers?.length > 0 && (
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{trip.travelers.join(", ")}</span>
              )}
            </div>
            {trip.notes && (
              <p className="mt-2 inline-flex items-start gap-2 text-sm text-foreground/80">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="whitespace-pre-wrap">{trip.notes}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={form.title ?? ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Destination</label>
              <Input value={form.destination ?? ""} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status ?? "planning"} onValueChange={v => setForm(f => ({ ...f, status: v as TripStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => {
                    const StatusIcon = s === "planning" ? ClipboardList : s === "upcoming" ? Calendar : s === "active" ? RefreshCw : CheckCircle2;
                    return <SelectItem key={s} value={s} className="capitalize" icon={<StatusIcon className="h-4 w-4 text-muted-foreground" />}>{s}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input type="date" value={form.start_date ?? ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End date</label>
              <Input type="date" value={form.end_date ?? ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        )}
      </SectionCard>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary ({itinerary.length})</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="places">Places ({places.length})</TabsTrigger>
          <TabsTrigger value="packing">Packing ({packedCount}/{packing.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SectionCard title="Itinerary" subtitle={`${itinerary.length} item${itinerary.length === 1 ? "" : "s"}`} accent="sage">
            {itinerary.length === 0 ? (
              <p className="text-xs text-muted-foreground">Add stops, meals, and activities by day.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {itinerary.slice(0, 5).map(i => (
                  <li key={i.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {i.day_date ? format(new Date(i.day_date + "T00:00:00"), "EEE d") : "—"}
                    </span>
                    <span className="truncate">{i.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Places" subtitle={`${places.length} saved`} accent="warm">
            {places.length === 0 ? (
              <p className="text-xs text-muted-foreground">Search and pin restaurants, sights, hotels, and activities.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {places.slice(0, 5).map(p => (
                  <li key={p.id} className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{p.category}</Badge>
                    <span className="truncate">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Packing" subtitle={`${packedCount} of ${packing.length} packed`} accent="calm">
            {packing.length === 0 ? (
              <p className="text-xs text-muted-foreground">Start from a template or add items by hand.</p>
            ) : (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${packing.length > 0 ? (packedCount / packing.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{Math.round((packedCount / Math.max(packing.length, 1)) * 100)}% packed</p>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="itinerary" className="mt-4">
          <SectionCard accent="sage">
            <TripItinerary
              tripId={trip.id}
              items={itinerary}
              startDate={trip.start_date}
              endDate={trip.end_date}
              onChanged={reloadItinerary}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <SectionCard accent="calm">
            <TripMap itinerary={itinerary} places={places} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="places" className="mt-4">
          <SectionCard accent="warm">
            <TripPlaces tripId={trip.id} places={places} onChanged={reloadPlaces} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="packing" className="mt-4">
          <SectionCard accent="calm">
            <TripPacking tripId={trip.id} items={packing} onChanged={reloadPacking} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}