import { useState } from "react";
import { Plus, Trash2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import {
  createPlace,
  deletePlace,
  fetchPlaceDetails,
  createItineraryItem,
  updatePlace,
  type TripPlace,
  type PlaceCategory,
} from "@/lib/trips/api";
import { toast } from "sonner";

const CATS: PlaceCategory[] = ["eat", "see", "do", "stay"];

export function TripPlaces({
  tripId,
  places,
  onChanged,
}: {
  tripId: string;
  places: TripPlace[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<any>(null);
  const [category, setCategory] = useState<PlaceCategory>("see");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function pick(p: { placeId: string; description: string }) {
    setPicked({ placeId: p.placeId, name: p.description });
    try {
      const d = await fetchPlaceDetails(p.placeId);
      setPicked(d);
      setQuery(d.name);
    } catch {}
  }

  async function save() {
    if (!picked?.name) return;
    setSaving(true);
    try {
      await createPlace({
        trip_id: tripId,
        name: picked.name,
        place_id: picked.placeId ?? null,
        address: picked.address ?? null,
        lat: picked.lat ?? null,
        lng: picked.lng ?? null,
        rating: picked.rating ?? null,
        photo_url: picked.photoUrl ?? null,
        category,
        notes: notes.trim() || null,
      });
      setOpen(false);
      setQuery(""); setPicked(null); setNotes(""); setCategory("see");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  async function addToItinerary(p: TripPlace) {
    try {
      await createItineraryItem({
        trip_id: tripId,
        title: p.name,
        place_id: p.place_id,
        place_name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
      });
      await updatePlace(p.id, { added_to_itinerary: true });
      toast.success("Added to itinerary");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove place?")) return;
    await deletePlace(id);
    onChanged();
  }

  const grouped = CATS.map((c) => ({ c, items: places.filter((p) => p.category === c) }));

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Save place</Button>
      {places.length === 0 && <p className="text-sm text-muted-foreground">No saved places yet.</p>}
      {grouped.map(({ c, items }) => items.length > 0 && (
        <div key={c}>
          <h3 className="font-semibold capitalize mb-2">{c}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((p) => (
              <Card key={p.id} className="p-3 flex gap-3">
                {p.photo_url && (
                  <img src={p.photo_url} alt={p.name} className="h-16 w-16 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium truncate">{p.name}</h4>
                    {p.rating != null && (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <Star className="h-3 w-3" /> {p.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  {p.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.address}</span>
                    </p>
                  )}
                  {p.notes && <p className="text-xs mt-1 line-clamp-2">{p.notes}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => addToItinerary(p)}>
                      Add to itinerary
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save a place</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Search</Label>
              <PlaceAutocomplete value={query} onChange={setQuery} onSelect={pick} placeholder="Restaurant, museum, hotel..." />
              {picked?.address && <p className="text-xs text-muted-foreground mt-1">{picked.address}</p>}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PlaceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!picked?.name || saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}