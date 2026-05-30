import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";
import { cn } from "@/lib/utils";

export function MentalLoadDumpWidget() {
  const [uid, setUid] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [recent, setRecent] = useState<{ id: string; content: string; ai_category?: string | null }[]>([]);
  const [listening, setListening] = useState(false);
  const [sorting, setSorting] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  async function load() {
    if (!uid) return;
    const { data } = await supabase
      .from("brain_dumps").select("id,content,ai_category")
      .eq("user_id", uid).neq("status", "archived").neq("status", "promoted")
      .order("created_at", { ascending: false }).limit(5);
    setRecent((data as any) ?? []);
  }
  useEffect(() => { void load(); }, [uid]);

  async function capture() {
    const content = draft.trim();
    if (!content || !uid) return;
    await supabase.from("brain_dumps").insert({ user_id: uid, content });
    setDraft("");
    void load();
  }

  async function sort() {
    if (!uid || recent.length === 0) return;
    setSorting(true);
    try {
      const { data, error } = await aiInvoke("ai-mental-load", {
        body: { action: "categorize_dump", items: recent.filter(r => !r.ai_category).map(r => ({ id: r.id, content: r.content })) },
      });
      if (error) throw error;
      for (const r of (data as any)?.items ?? []) {
        await supabase.from("brain_dumps")
          .update({ ai_category: r.category, ai_title: r.title, status: "sorted" })
          .eq("id", r.id);
      }
      toast.success("Sorted softly.");
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't sort right now.");
    } finally { setSorting(false); }
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.message("Voice capture isn't supported in this browser."); return; }
    if (listening) { recRef.current?.stop?.(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false;
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
    <div className="space-y-2">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="What's on your mind? Drop it here…"
        rows={3}
        className="rounded-2xl bg-card/60 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void capture(); }
        }}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={capture} disabled={!draft.trim()}>Capture</Button>
        <Button size="sm" variant="outline" onClick={toggleMic} className={cn(listening && "border-rose-400/60 text-rose-600 dark:text-rose-300")}>
          {listening ? <MicOff className="mr-1 h-3.5 w-3.5" /> : <Mic className="mr-1 h-3.5 w-3.5" />}
          {listening ? "Listening" : "Voice"}
        </Button>
        <Button size="sm" variant="ghost" onClick={sort} disabled={sorting || recent.length === 0}>
          <Sparkles className={cn("mr-1 h-3.5 w-3.5", sorting && "animate-pulse")} />
          {sorting ? "Sorting…" : "Sort"}
        </Button>
      </div>
      {recent.length > 0 && (
        <ul className="space-y-1 pt-1">
          {recent.map((r) => (
            <li key={r.id} className="truncate rounded-lg bg-muted/40 px-2 py-1 text-xs text-foreground/80">
              {r.ai_category ? <span className="mr-1 text-[10px] uppercase text-muted-foreground">{r.ai_category}</span> : null}
              {r.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}