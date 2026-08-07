import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import type { PlannerView } from "@/lib/planner-prefs";

/**
 * Legacy /week, /month and /calendar links now land on the unified planner
 * at the matching range, preserving any ?date= parameter.
 */
export default function PlannerRedirect({ range }: { range: PlannerView }) {
  const { date } = useParams<{ date?: string }>();
  const [search] = useSearchParams();
  const raw = date ?? search.get("date") ?? "";
  const parsed = raw ? parseISO(raw) : null;
  const day = parsed && isValid(parsed) ? parsed : new Date();
  return <Navigate replace to={`/planner/${format(day, "yyyy-MM-dd")}?range=${range}`} />;
}
