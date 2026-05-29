import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function ymKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function useAIUsage(userId: string | null | undefined) {
  const [used, setUsed] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setUsed(0); setLoading(false); return; }
    const month = ymKey();

    async function load() {
      const { data } = await supabase.from("ai_usage")
        .select("weighted_calls").eq("user_id", userId!).eq("year_month", month).maybeSingle();
      setUsed(((data as any)?.weighted_calls as number) ?? 0);
      setLoading(false);
    }
    load();

    const channel = supabase.channel(`ai-usage-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ai_usage", filter: `user_id=eq.${userId}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { used, loading };
}