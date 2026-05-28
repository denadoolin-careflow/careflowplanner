import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import {
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  fetchPlaceDetails,
  type ItineraryItem,
  type ItineraryCategory,
} from "@/lib/trips/api";
import { toast } from "sonner";

const CATS: ItineraryCategory[] = ["eat", "see", "do", "stay", "travel", "other"];

export function ItineraryItemDialog({
  tripId,
  item,
  defaultDate,
  open,
  onOpenChange,
  onSaved,
}: {
  tripId: string;
  item: ItineraryItem | null;
  defaultDate?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dayDate, setDayDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<ItineraryCategory>("other");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [place, setPlace] = useState<{
    placeId: string | null;
    name: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  }>({ placeId: null, name: null, address: null, lat: null, lng: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setDayDate(item?.day_date ?? defaultDate ?? "");
      setStartTime(item?.start_time?.slice(0, 5) ?? "");
      setEndTime(item?.end_time?.slice(0, 5) ?? "");
      setCategory((item?.category as ItineraryCategory) ?? "other");
      setNotes(item?.notes ?? "");
      setCost(item?.cost?.toString() ?? "");
      setPlaceQuery(item?.place_name ?? "");
      setPlace({
        placeId: item?.place_id ?? null,
        name: item?.place_name ?? null,
        address: item?.address ?? null,
        lat: item?.lat ?? null,
        lng: item?.lng ?? null,
      });
    }
  }, [open, item, defaultDate]);

  async function handlePickPlace(p: { placeId: string; description: string }) {
    setPlace({ placeId: p.placeId, name: p.description, address: null, lat: null, lng: null });
    try {
      const d = await fetchPlaceDetails(p.placeId);
      setPlace({ placeId: d.placeId, name: d.name, address: d.address, lat: d.lat, lng: d.lng });
      setPlaceQuery(d.name || p.description);
    } catch (e) {
      // keep partial place selection
    }
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        day_date: dayDate || null,
        start_time: startTime || null,
        end_time: endTime || null,
        category,
        notes: notes.trim() || null,
        cost: cost ? Number(cost) : null,
        place_id: place.placeId,
        place_name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      };
      if (item) await updateItineraryItem(item.id, payload);
      else await createItineraryItem({ trip_id: tripId, ...payload });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirm("Delete this activity?")) return;
    await deleteItineraryItem(item.id);
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit activity" : "Add activity"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Visit Senso-ji Temple" />
          </div>
          <div>
            <Label>Location</Label>
            <PlaceAutocomplete value={placeQuery} onChange={setPlaceQuery} onSelect={handlePickPlace} />
            {place.address && <p className="text-xs text-muted-foreground mt-1">{place.address}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ItineraryCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cost</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {item && (
              <Button variant="destructive" onClick={remove}>Delete</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !title.trim()}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}