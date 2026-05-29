import { supabase } from "@/integrations/supabase/client";

export interface DinnerPoll {
  id: string;
  household_id: string;
  week_start: string;
  title: string | null;
  notes: string | null;
  status: "open" | "closed";
  created_by: string;
  created_at: string;
}

export interface DinnerPollCandidate {
  id: string;
  poll_id: string;
  day_date: string;
  slot: string;
  meal_id: string | null;
  custom_title: string | null;
  notes: string | null;
  position: number;
}

export interface DinnerPollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  day_date: string;
  kind: "vote" | "request";
  candidate_id: string | null;
  meal_id: string | null;
  custom_title: string | null;
  note: string | null;
  created_at: string;
}

export async function getPollForWeek(householdId: string, weekStart: string): Promise<DinnerPoll | null> {
  const { data } = await supabase
    .from("dinner_polls" as any)
    .select("*")
    .eq("household_id", householdId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return (data as unknown as DinnerPoll) ?? null;
}

export async function createPoll(householdId: string, weekStart: string, userId: string, title?: string): Promise<DinnerPoll | null> {
  const { data, error } = await supabase
    .from("dinner_polls" as any)
    .insert({ household_id: householdId, week_start: weekStart, created_by: userId, title: title ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DinnerPoll;
}

export async function updatePoll(id: string, patch: Partial<Pick<DinnerPoll, "title" | "notes" | "status">>) {
  await supabase.from("dinner_polls" as any).update(patch).eq("id", id);
}

export async function deletePoll(id: string) {
  await supabase.from("dinner_polls" as any).delete().eq("id", id);
}

export async function listCandidates(pollId: string): Promise<DinnerPollCandidate[]> {
  const { data } = await supabase
    .from("dinner_poll_candidates" as any)
    .select("*")
    .eq("poll_id", pollId)
    .order("day_date", { ascending: true })
    .order("position", { ascending: true });
  return (data ?? []) as unknown as DinnerPollCandidate[];
}

export async function addCandidate(pollId: string, day: string, opts: { mealId?: string | null; customTitle?: string | null; position?: number }) {
  const { data } = await supabase
    .from("dinner_poll_candidates" as any)
    .insert({
      poll_id: pollId,
      day_date: day,
      slot: "dinner",
      meal_id: opts.mealId ?? null,
      custom_title: opts.customTitle ?? null,
      position: opts.position ?? 0,
    })
    .select()
    .single();
  return data as unknown as DinnerPollCandidate;
}

export async function removeCandidate(id: string) {
  await supabase.from("dinner_poll_candidates" as any).delete().eq("id", id);
}

export async function listResponses(pollId: string): Promise<DinnerPollResponse[]> {
  const { data } = await supabase
    .from("dinner_poll_responses" as any)
    .select("*")
    .eq("poll_id", pollId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as DinnerPollResponse[];
}

export async function castVote(pollId: string, userId: string, day: string, candidateId: string) {
  // Replace existing vote for this user/day with the new candidate.
  await supabase
    .from("dinner_poll_responses" as any)
    .delete()
    .eq("poll_id", pollId)
    .eq("user_id", userId)
    .eq("day_date", day)
    .eq("kind", "vote");
  const { data } = await supabase
    .from("dinner_poll_responses" as any)
    .insert({ poll_id: pollId, user_id: userId, day_date: day, kind: "vote", candidate_id: candidateId })
    .select()
    .single();
  return data as unknown as DinnerPollResponse;
}

export async function clearVote(pollId: string, userId: string, day: string) {
  await supabase
    .from("dinner_poll_responses" as any)
    .delete()
    .eq("poll_id", pollId)
    .eq("user_id", userId)
    .eq("day_date", day)
    .eq("kind", "vote");
}

export async function submitRequest(pollId: string, userId: string, day: string, opts: { mealId?: string | null; customTitle?: string | null; note?: string | null }) {
  const { data } = await supabase
    .from("dinner_poll_responses" as any)
    .insert({
      poll_id: pollId,
      user_id: userId,
      day_date: day,
      kind: "request",
      meal_id: opts.mealId ?? null,
      custom_title: opts.customTitle ?? null,
      note: opts.note ?? null,
    })
    .select()
    .single();
  return data as unknown as DinnerPollResponse;
}

export async function removeResponse(id: string) {
  await supabase.from("dinner_poll_responses" as any).delete().eq("id", id);
}