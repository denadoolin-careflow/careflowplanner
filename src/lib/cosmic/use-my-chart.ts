import { useMemo } from "react";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { computeNatalV2, type NatalChartV2 } from "@/lib/cosmic/chart";

/** The signed-in user's natal chart, memoised on the saved birth details. */
export function useMyChart(): { chart: NatalChartV2 | null; loading: boolean } {
  const { row, loading } = useBirthChart() as any;
  const chart = useMemo(() => row ? computeNatalV2({
    date: row.birth_date, time: row.birth_time, tz: row.birth_tz, lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place, house_system: "whole-sign",
  }) : null, [row?.birth_date, row?.birth_time, row?.birth_tz, row?.birth_lat, row?.birth_lng]);
  return { chart, loading: !!loading };
}
