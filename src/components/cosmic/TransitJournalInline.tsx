import { useCallback, useEffect, useState } from "react";
import { Star, Save, BookOpen, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  eventLabel: string;
  eventDate?: string; // ISO yyyy-mm-dd
  /** Pre-fill prompt; user can edit. */
  prompt?: string;
  compact?: boolean;
  className?: string;
  /** Hide "save to journal / save to notes" CTAs (e.g. inside a dashboard chip). */
  hideSaveDestinations?: boolean;
}

/**
 * Inline composer for rating + journaling a single transit.
 * Saves to `transit_reflections` and optionally mirrors to journal_entries
 * or notes when the user picks a save destination.
 */
export function TransitJournalInline({
  eventId, eventLabel, eventDate, prompt, compact, className, hideSaveDestinations,
}: Props) {
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing reflection for this event
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("transit_reflections")
        .select("rating,note")
        .eq("user_id", u.user.id).eq("event_id", eventId).maybeSingle();
      if (cancelled) return;
      if (data) {
        setRating((data as any).rating ?? 0);
        setNote((data as any).note ?? "");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  const saveReflection = useCallback(async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        toast({ title: "Sign in to save", description: "Reflections save to your account." });
        return;
      }
      const payload: any = {
        user_id: u.user.id,
        event_id: eventId,
        event_date: eventDate ?? null,
        event_label: eventLabel,
        rating: rating || null,
        note,
      };
      const { error } = await (supabase as any)
        .from("transit_reflections")
        .upsert(payload, { onConflict: "user_id,event_id" });
      if (error) throw error;
      toast({ title: "Reflection saved" });
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message ?? "Try again", variant: "destructive" });
    } finally { setSaving(false); }
  }, [eventId, eventDate, eventLabel, rating, note, toast]);

  const saveToJournal = useCallback(async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        toast({ title: "Sign in to save", description: "Journal entries save to your account." });
        return;
      }
      const body = [
        `**${eventLabel}**${eventDate ? ` · ${eventDate}` : ""}`,
        prompt ? `> ${prompt}` : "",
        note || "",
      ].filter(Boolean).join("\n\n");
      const { data: entry, error } = await (supabase as any)
        .from("journal_entries")
        .insert({
          user_id: u.user.id,
          date: eventDate ?? new Date().toISOString().slice(0, 10),
          type: "cosmic",
          title: eventLabel,
          body,
          tags: ["cosmic", "transit"],
        })
        .select("id").maybeSingle();
      if (error) throw error;
      // Save reflection + link
      await saveReflection();
      if (entry?.id) {
        await (supabase as any).from("cosmic_journal_entries").insert({
          user_id: u.user.id,
          journal_entry_id: entry.id,
          event_id: eventId,
          event_date: eventDate ?? null,
        });
      }
      toast({ title: "Saved to Cosmic Journal" });
    } catch (e: any) {
      toast({ title: "Couldn't save journal", description: e?.message ?? "Try again", variant: "destructive" });
    } finally { setSaving(false); }
  }, [eventId, eventLabel, eventDate, prompt, note, saveReflection, toast]);

  const saveToNotes = useCallback(async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        toast({ title: "Sign in to save", description: "Notes save to your account." });
        return;
      }
      const body = [
        prompt ? `> ${prompt}\n` : "",
        note || "",
      ].filter(Boolean).join("\n");
      const { error } = await (supabase as any).from("notes").insert({
        user_id: u.user.id,
        title: `Transit · ${eventLabel}${eventDate ? ` · ${eventDate}` : ""}`,
        body,
        kind: "note",
        tags: ["cosmic", "transit"],
        icon: "Sparkles",
      });
      if (error) throw error;
      await saveReflection();
      toast({ title: "Saved to Notes" });
    } catch (e: any) {
      toast({ title: "Couldn't save note", description: e?.message ?? "Try again", variant: "destructive" });
    } finally { setSaving(false); }
  }, [eventLabel, eventDate, prompt, note, saveReflection, toast]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          How did this land?
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} of 5`}
              onClick={() => setRating(rating === n ? 0 : n)}
              className="rounded p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  n <= rating ? "fill-primary text-primary" : "text-muted-foreground/50",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {prompt && (
        <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[12px] italic leading-snug text-muted-foreground">
          {prompt}
        </p>
      )}

      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={compact ? "Add a quick reflection…" : "What did you notice? How did this land in your day?"}
        className={cn("resize-none text-[13px]", compact ? "min-h-[60px]" : "min-h-[80px]")}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="secondary" className="h-7 gap-1.5" onClick={saveReflection} disabled={saving || loading}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
        {!hideSaveDestinations && (
          <>
            <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={saveToJournal} disabled={saving || loading || !note.trim()}>
              <BookOpen className="h-3 w-3" /> Cosmic Journal
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={saveToNotes} disabled={saving || loading || !note.trim()}>
              <FileText className="h-3 w-3" /> Notes
            </Button>
          </>
        )}
      </div>
    </div>
  );
}