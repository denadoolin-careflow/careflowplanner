import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Sparkles, Trash2, ListTodo, Archive } from "lucide-react";
import { toast } from "sonner";
import { BrainDump, categoryLabel, categoryTone } from "@/lib/mental-load";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";

export function BrainDumpInbox({ uid }: { uid: string }) {
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<BrainDump[]>([]);
  const [sorting, setSorting] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  async function load() {
    const { data } = await supabase
      .from("brain_dumps").select("*")
      .eq("user_id", uid).neq("status", "archived").neq("status", "promoted")
      .order("created_at", { ascending: false }).limit(50);
    setItems((data ?? []) as BrainDump[]);
  }
  useEffect(() => { load(); }, [uid]);

  async function addDump(text?: string) {
    const content = (text ?? draft).trim();
    if (!content) return;
    const { error } = await supabase.from("brain_dumps").insert({
      user_id: uid, content,
    });
    if (error) { toast.error(error.message); return; }
    setDraft("");
    load();
  }

  async function archive(id: string) {
    await supabase.from("brain_dumps").update({ status: "archived" }).eq("id", id);
    load();
  }
  async function remove(id: string) {
    await supabase.from("brain_dumps").delete().eq("id", id);
    load();
  }

  async function promote(d: BrainDump) {
    const title = d.ai_title?.trim() || d.content.slice(0, 80);
    const { data: task, error } = await supabase.from("tasks").insert({
      user_id: uid,
      title,
      area: "Personal",
      notes: d.ai_title ? d.content : null,
      tags: ["mental-load"],
      inbox: true,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("brain_dumps")
      .update({ status: "promoted", promoted_task_id: task!.id })
      .eq("id", d.id);
    toast.success("Added to your tasks — gently.");
    load();
  }

  async function sortGently() {
    const inbox = items.filter((i) => !i.ai_category).slice(0, 20);
    if (inbox.length === 0) { toast.message("Nothing new to sort."); return; }
    setSorting(true);
    try {
      const { data, error } = await aiInvoke("ai-mental-load", {
        body: { action: "categorize_dump", items: inbox.map((i) => ({ id: i.id, content: i.content })) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      for (const r of (data?.items ?? [])) {
        await supabase.from("brain_dumps")
          .update({ ai_category: r.category, ai_title: r.title, status: "sorted" })
          .eq("id", r.id);
      }
      toast.success("Sorted softly into buckets.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't sort right now.");
    } finally { setSorting(false); }
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.message("Voice capture isn't supported in this browser."); return; }
    if (listening) {
      recRef.current?.stop?.();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
      if (text) setDraft((d) => (d ? `${d} ${text}` : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <SectionCard
      title="Brain dump inbox"
      subtitle="Drop it here. You don't have to sort it yet."
      accent="sage"
      action={
        <Button size="sm" variant="ghost" onClick={sortGently} disabled={sorting}>
          <Sparkles className={cn("mr-1 h-3.5 w-3.5", sorting && "animate-pulse")} />
          {sorting ? "Sorting…" : "Sort gently"}
        </Button>
      }
    >
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addDump(); }
          }}
          placeholder="Need to call dentist · laundry piling up · overwhelmed about groceries…"
          rows={3}
          className="rounded-2xl bg-card/60 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => addDump()} disabled={!draft.trim()}>
            Capture
          </Button>
          <Button size="sm" variant="outline" onClick={toggleMic} className={cn(listening && "border-rose-400/60 text-rose-600 dark:text-rose-300")}>
            {listening ? <MicOff className="mr-1 h-3.5 w-3.5" /> : <Mic className="mr-1 h-3.5 w-3.5" />}
            {listening ? "Listening" : "Voice"}
          </Button>
          <span className="text-[11px] text-muted-foreground">Cmd/Ctrl + Enter to save</span>
        </div>

        <div className="mt-3 space-y-1.5">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing in here. Empty inboxes are allowed.</p>
          )}
          {items.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-2 rounded-xl border border-border/40 bg-card/40 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.ai_category && (
                    <Badge variant="outline" className={cn("font-normal", categoryTone(d.ai_category))}>
                      {categoryLabel(d.ai_category)}
                    </Badge>
                  )}
                  <span className="text-sm">{d.ai_title || d.content}</span>
                </div>
                {d.ai_title && d.ai_title !== d.content && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{d.content}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {d.ai_category === "task" || d.ai_category === "errand" || d.ai_category === "routine" || d.ai_category === "appointment" ? (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => promote(d)}>
                    <ListTodo className="mr-1 h-3.5 w-3.5" /> Move to tasks
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => archive(d.id)}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => remove(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}