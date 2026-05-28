import { supabase } from "@/integrations/supabase/client";

export type TripStatus = "planning" | "upcoming" | "active" | "completed";
export type ItineraryCategory = "eat" | "see" | "do" | "stay" | "travel" | "other";
export type PlaceCategory = "eat" | "see" | "do" | "stay";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  notes: string | null;
  status: TripStatus;
  travelers: string[];
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  user_id: string;
  day_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string;
  notes: string | null;
  place_id: string | null;
  place_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: ItineraryCategory;
  cost: number | null;
  sort_order: number;
}

export interface TripPlace {
  id: string;
  trip_id: string;
  user_id: string;
  place_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: PlaceCategory;
  notes: string | null;
  rating: number | null;
  photo_url: string | null;
  added_to_itinerary: boolean;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  user_id: string;
  category: string;
  name: string;
  quantity: number;
  packed: boolean;
  sort_order: number;
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function getTrip(id: string): Promise<Trip> {
  const { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Trip;
}

export async function createTrip(input: Partial<Trip>): Promise<Trip> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id,
      title: input.title ?? "Untitled trip",
      destination: input.destination ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "planning",
      travelers: input.travelers ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function updateTrip(id: string, patch: Partial<Trip>) {
  const { error } = await supabase.from("trips").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTrip(id: string) {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}

// Itinerary
export async function listItinerary(tripId: string): Promise<ItineraryItem[]> {
  const { data, error } = await supabase
    .from("trip_itinerary_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_date", { ascending: true, nullsFirst: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItineraryItem[];
}

export async function createItineraryItem(input: Partial<ItineraryItem> & { trip_id: string }) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("trip_itinerary_items")
    .insert({
      user_id,
      trip_id: input.trip_id,
      title: input.title ?? "New activity",
      day_date: input.day_date ?? null,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
      notes: input.notes ?? null,
      place_id: input.place_id ?? null,
      place_name: input.place_name ?? null,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      category: input.category ?? "other",
      cost: input.cost ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ItineraryItem;
}

export async function updateItineraryItem(id: string, patch: Partial<ItineraryItem>) {
  const { error } = await supabase.from("trip_itinerary_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItineraryItem(id: string) {
  const { error } = await supabase.from("trip_itinerary_items").delete().eq("id", id);
  if (error) throw error;
}

// Places
export async function listPlaces(tripId: string): Promise<TripPlace[]> {
  const { data, error } = await supabase
    .from("trip_places")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TripPlace[];
}

export async function createPlace(input: Partial<TripPlace> & { trip_id: string; name: string }) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("trip_places")
    .insert({
      user_id,
      trip_id: input.trip_id,
      name: input.name,
      place_id: input.place_id ?? null,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      category: input.category ?? "see",
      notes: input.notes ?? null,
      rating: input.rating ?? null,
      photo_url: input.photo_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TripPlace;
}

export async function updatePlace(id: string, patch: Partial<TripPlace>) {
  const { error } = await supabase.from("trip_places").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePlace(id: string) {
  const { error } = await supabase.from("trip_places").delete().eq("id", id);
  if (error) throw error;
}

// Packing
export async function listPacking(tripId: string): Promise<PackingItem[]> {
  const { data, error } = await supabase
    .from("trip_packing_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PackingItem[];
}

export async function createPacking(input: Partial<PackingItem> & { trip_id: string; name: string }) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("trip_packing_items")
    .insert({
      user_id,
      trip_id: input.trip_id,
      name: input.name,
      category: input.category ?? "Other",
      quantity: input.quantity ?? 1,
      packed: input.packed ?? false,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PackingItem;
}

export async function bulkCreatePacking(
  tripId: string,
  items: Array<{ name: string; category: string; quantity?: number }>,
) {
  const user_id = await uid();
  const rows = items.map((it, i) => ({
    user_id,
    trip_id: tripId,
    name: it.name,
    category: it.category,
    quantity: it.quantity ?? 1,
    packed: false,
    sort_order: i,
  }));
  const { error } = await supabase.from("trip_packing_items").insert(rows);
  if (error) throw error;
}

export async function updatePacking(id: string, patch: Partial<PackingItem>) {
  const { error } = await supabase.from("trip_packing_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePacking(id: string) {
  const { error } = await supabase.from("trip_packing_items").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchPlaceDetails(placeId: string) {
  const { data, error } = await supabase.functions.invoke("places-details", {
    body: { placeId },
  });
  if (error) throw error;
  return data as {
    placeId: string;
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
    rating: number | null;
    photoUrl: string | null;
    types: string[];
  };
}