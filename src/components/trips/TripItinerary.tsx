import { useState } from "react";
import { Plus, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ItineraryItem } from "@/lib/trips/api";
import { ItineraryItemDialog } from "./ItineraryItemDialog";
import { format } from "date-fns";

export function TripItinerary({
  tripId,
  items,
  startDate,
  endDate,
  onChanged,
}: {
  tripId: string;
  items: ItineraryItem[];
  startDate: string | null;
  endDate: string | null;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ItineraryItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();
  const [open, setOpen] = useState(false);

  const days: string[] = [];
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
  }
  const unscheduledDates = Array.from(
    new Set(items.map((i) => i.day_date).filter((d): d is string => !!d && !days.includes(d))),
  );
  const allDays = [...days, ...unscheduledDates];
  const unscheduled = items.filter((i) => !i.day_date);

  function openNew(date?: string) {
    setEditing(null);
    setDefaultDate(date);
    setOpen(true);
  }
  function openEdit(it: ItineraryItem) {
    setEditing(it);
    setDefaultDate(undefined);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" /> Add activity</Button>

      {allDays.length === 0 && unscheduled.length === 0 && (
        <p className="text-muted-foreground text-sm">No activities yet. Add your first stop.</p>
      )}

      {allDays.map((date) => {
        const dayItems = items.filter((i) => i.day_date === date);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{format(new Date(date), "EEE, MMM d")}</h3>
              <Button variant="ghost" size="sm" onClick={() => openNew(date)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {dayItems.length === 0 && (
                <p className="text-xs text-muted-foreground pl-1">Nothing planned</p>
              )}
              {dayItems.map((it) => (
                <Card
                  key={it.id}
                  className="p-3 cursor-pointer hover:bg-accent/30"
                  onClick={() => openEdit(it)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{it.category}</Badge>
                        <h4 className="font-medium truncate">{it.title}</h4>
                      </div>
                      {it.place_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" /> <span className="truncate">{it.place_name}</span>
                        </div>
                      )}
                      {it.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.notes}</p>}
                    </div>
                    {(it.start_time || it.end_time) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {it.start_time?.slice(0, 5)}
                        {it.end_time && `–${it.end_time.slice(0, 5)}`}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {unscheduled.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-muted-foreground">Unscheduled</h3>
          <div className="space-y-2">
            {unscheduled.map((it) => (
              <Card key={it.id} className="p-3 cursor-pointer hover:bg-accent/30" onClick={() => openEdit(it)}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{it.category}</Badge>
                  <h4 className="font-medium truncate">{it.title}</h4>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ItineraryItemDialog
        tripId={tripId}
        item={editing}
        defaultDate={defaultDate}
        open={open}
        onOpenChange={setOpen}
        onSaved={onChanged}
      />
    </div>
  );
}