import { useEffect, useState } from "react";
import { Sparkles, Wand2, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { aiInvoke } from "@/lib/ai-invoke";
import { useStore, todayISO } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { suggestAnchorForText } from "@/lib/anchor-suggest";
import { getAnchor } from "@/lib/anchors";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type CaptureResult = {
  module: "task" | "note" | "grocery" | "idea" | "journal";
  summary: string;
  payload: any;
};

/**
 * Unified AI Capture experience — Phase C of CARE. Listens for
 * `careflow:ai-capture` to open. Free-form text in → AI proposes a
 * structured action → user confirms with one tap.
 */
export function AICaptureDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const dictation = useVoiceDictation((t) => setText(t));
  const { addTask, addIdea, addGrocery, addJournal } = useStore() as any;
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = () => { setOpen(true); setResult(null); setText(""); };
    window.addEventListener("careflow:ai-capture", onOpen);
    return () => window.removeEventListener("careflow:ai-capture", onOpen);
  }, []);

  const interpret = async () => {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    const { data, error } = await aiInvoke<CaptureResult>("ai-capture-assistant", { body: { text: t } });
    setLoading(false);
    if (error || !data) {
      toast.error("Couldn't interpret that — try rephrasing.");
      return;
    }
    if (!data.payload?.anchorKey) {
      const guess = suggestAnchorForText(t);
      if (guess) data.payload = { ...data.payload, anchorKey: guess };
    }
    setResult(data);
  };

  const confirm = async () => {
    if (!result) return;
    const anchorKey = result.payload?.anchorKey ?? undefined;
    try {
      if (result.module === "task") {
        await addTask({
          title: result.payload.title,
          area: result.payload.area ?? "Personal",
          priority: result.payload.priority ?? "medium",
          status: result.payload.status ?? "active",
          dueDate: result.payload.dueDate,
          estMinutes: result.payload.estMinutes,
          anchorKey,
        });
        toast.success("Captured", { description: result.payload.title });
        const route = result.payload.dueDate === todayISO()
          ? "/today"
          : result.payload.dueDate ? "/week" : "/inbox";
        navigate(route);
      } else if (result.module === "idea") {
        await addIdea({ title: result.payload.title, notes: result.payload.body, anchorKey });
        toast.success("Saved to Ideas");
        navigate("/ideas");
      } else if (result.module === "grocery") {
        const items: any[] = result.payload.items ?? [];
        for (const it of items) await addGrocery(it.name);
        toast.success(`Added ${items.length} grocery ${items.length === 1 ? "item" : "items"}`);
        navigate("/home/groceries");
      } else if (result.module === "journal") {
        await addJournal({ body: result.payload.body, anchorKey });
        toast.success("Journal entry saved");
        navigate("/journal");
      } else if (result.module === "note") {
        // Notes store API isn't uniform — fall back to idea for now.
        await addIdea({ title: result.payload.title, notes: result.payload.body, anchorKey });
        toast.success("Note captured");
        navigate("/ideas");
      }
    } catch (e: any) {
      toast.error("Couldn't save", { description: e?.message });
      return;
    }
    setOpen(false);
  };

  const anchor = getAnchor(result?.payload?.anchorKey);
  const AnchorIcon = anchor?.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-4 border-primary/20 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Capture anything
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            placeholder="Type or speak — a task, idea, grocery, journal thought…"
            className="min-h-[120px] resize-none pr-10"
          />
          {dictation.supported && (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-label="Voice capture"
              className={cn(
                "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border/60 transition-colors",
                dictation.listening
                  ? "border-rose-400/60 bg-rose-500/10 text-rose-600 animate-pulse"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {dictation.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {result && (
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="rounded-full bg-primary/10 text-[10px] uppercase tracking-wide text-primary">
                {result.module}
              </Badge>
              {anchor && AnchorIcon && (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", anchor.tint)}>
                  <AnchorIcon className="h-3 w-3" />
                  {anchor.label}
                </span>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">{result.summary}</p>
            {result.payload?.title && (
              <p className="mt-2 font-medium text-foreground">{result.payload.title}</p>
            )}
            {result.payload?.body && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{result.payload.body}</p>
            )}
            {result.module === "grocery" && Array.isArray(result.payload?.items) && (
              <ul className="mt-2 grid gap-1">
                {result.payload.items.map((it: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> {it.name}
                    {it.quantity && <span className="text-muted-foreground">· {it.quantity}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {!result ? (
            <Button onClick={interpret} disabled={loading || !text.trim()}>
              {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-2 h-3.5 w-3.5" />}
              Interpret with AI
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setResult(null)}>Rewrite</Button>
              <Button onClick={confirm}>
                <Check className="mr-2 h-3.5 w-3.5" /> Confirm
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}