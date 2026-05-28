import { Link } from "react-router-dom";
import { MapPin, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Trip } from "@/lib/trips/api";
import { format } from "date-fns";

export function TripCard({ trip }: { trip: Trip }) {
  const dates =
    trip.start_date && trip.end_date
      ? `${format(new Date(trip.start_date), "MMM d")} – ${format(new Date(trip.end_date), "MMM d, yyyy")}`
      : trip.start_date
        ? format(new Date(trip.start_date), "MMM d, yyyy")
        : "Dates TBD";

  return (
    <Link to={`/trips/${trip.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5">
        <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 relative">
          {trip.cover_image_url && (
            <img src={trip.cover_image_url} alt={trip.title} className="w-full h-full object-cover" />
          )}
          <Badge className="absolute top-2 right-2 capitalize" variant="secondary">
            {trip.status}
          </Badge>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg truncate">{trip.title}</h3>
          {trip.destination && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{trip.destination}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dates}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}