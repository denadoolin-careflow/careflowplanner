import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreatePeriodNote, updateNote, type NoteProperty } from "@/lib/notes";
import { monthKeyFor } from "@/lib/notes/periods";
import { emptyPhaseIntentions, readPhaseIntentions, writePhaseIntentions, type PhaseIntentions } from "@/lib/planner/monthly-phase-intentions";

export function useMonthlyPhaseIntentions(month: Date) {
  const monthISO = monthKeyFor(month);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["monthly-phase-intentions", monthISO],
    queryFn: async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Please sign in to load intentions");
      const { data, error } = await supabase.from("notes").select("properties").eq("user_id", auth.user.id).eq("kind", "monthly").eq("date", monthISO).order("updated_at", { ascending: false }).limit(1);
      if (error) throw error;
      return readPhaseIntentions((data?.[0]?.properties ?? []) as unknown as NoteProperty[]);
    },
  });
  const save = async (intentions: PhaseIntentions) => {
    const note = await getOrCreatePeriodNote("monthly", monthISO);
    await updateNote(note.id, { properties: writePhaseIntentions(note.properties ?? [], intentions) });
    client.setQueryData(["monthly-phase-intentions", monthISO], readPhaseIntentions(writePhaseIntentions([], intentions)));
  };
  return { intentions: query.data ?? emptyPhaseIntentions(), loading: query.isPending, error: query.error, save, reload: query.refetch };
}