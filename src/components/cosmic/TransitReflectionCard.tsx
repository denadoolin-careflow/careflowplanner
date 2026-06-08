import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Loader2, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";
import { reflectionPromptFor, aspectTone } from "@/lib/cosmic/interpretations";

/**
 * Picks the most charged tension aspect today and offers a journal prompt.
 * Saves to `journal_entries` (template = 'cosmic_transit').
 */
export function TransitReflectionCard({ date }: { date: Date }) {
  const today = format(date, "yyyy-MM-dd");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const focus = useMemo(() => {
    const all = getActiveAspects(date, 6);
    return all.find((a) => aspectTone(a.aspect) === "tension") ?? all[0] ?? null;
  }, [date]);

  if (!focus) {
    return (
      <section className="cozy-card glass-panel p-5">
        <h3 className="font-display text-base">Transit Reflection</h3>
        <p className="mt-2 text-[12.5px] italic text-muted-foreground">
          The sky is quiet today — let your own thoughts be the prompt.
        </p>
      </section>
    );
  }

  const prompt = reflectionPromptFor(focus.aspect);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sign in to save reflections.");
      const body = `**${focus.title}** — ${prompt}\n\n${text.trim()}`;
      const { error } = await supabase.from("journal_entries").insert({
        user_id: uid,
        date: today,
        type: "cosmic",
        template: "cosmic_transit",
        body,
        anchor_key: "reflection",
        prompts: [prompt],
        tags: ["cosmic", focus.aspect, focus.a, focus.b],
      });
      if (error) throw error;
      setSaved(true);
      toast.success("Reflection saved to your journal.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save reflection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cozy-card glass-panel p-5" aria-label="Transit reflection">
      <header>
        <h3 className="font-display text-base">Transit Reflection</h3>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{focus.title}</p>
      </header>
      <p className="mt-2 text-[13px] italic text-foreground/85">"{prompt}"</p>
      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        placeholder="Soft, honest words. No pressure."
        className="mt-3 min-h-[110px] resize-none bg-card/60"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving || saved || !text.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : saved ? <Check className="h-3.5 w-3.5 mr-1" /> : null}
          {saved ? "Saved" : "Save reflection"}
        </Button>
      </div>
    </section>
  );
}