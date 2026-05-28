CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  cover_image_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  travelers TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_select_own" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trips_set_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_itinerary_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_date DATE,
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  notes TEXT,
  place_id TEXT,
  place_name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category TEXT NOT NULL DEFAULT 'other',
  cost NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_itinerary_items TO authenticated;
GRANT ALL ON public.trip_itinerary_items TO service_role;
ALTER TABLE public.trip_itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tii_select_own" ON public.trip_itinerary_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tii_insert_own" ON public.trip_itinerary_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tii_update_own" ON public.trip_itinerary_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tii_delete_own" ON public.trip_itinerary_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tii_trip ON public.trip_itinerary_items(trip_id, day_date, start_time);
CREATE TRIGGER tii_set_updated_at BEFORE UPDATE ON public.trip_itinerary_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category TEXT NOT NULL DEFAULT 'see',
  notes TEXT,
  rating NUMERIC,
  photo_url TEXT,
  added_to_itinerary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_places TO authenticated;
GRANT ALL ON public.trip_places TO service_role;
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tp_select_own" ON public.trip_places FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tp_insert_own" ON public.trip_places FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tp_update_own" ON public.trip_places FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tp_delete_own" ON public.trip_places FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tp_trip ON public.trip_places(trip_id);
CREATE TRIGGER tp_set_updated_at BEFORE UPDATE ON public.trip_places FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.trip_packing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  packed BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_packing_items TO authenticated;
GRANT ALL ON public.trip_packing_items TO service_role;
ALTER TABLE public.trip_packing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpk_select_own" ON public.trip_packing_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tpk_insert_own" ON public.trip_packing_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tpk_update_own" ON public.trip_packing_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tpk_delete_own" ON public.trip_packing_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_tpk_trip ON public.trip_packing_items(trip_id);
CREATE TRIGGER tpk_set_updated_at BEFORE UPDATE ON public.trip_packing_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();