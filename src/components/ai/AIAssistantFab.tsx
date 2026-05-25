import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Wand2, CalendarDays, ListChecks, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDraggableFab } from "@/hooks/use-draggable-fab";

type Msg = { role: "user" | "assistant"; content: string; plan?: any };

const SUGGESTIONS = [
  { label: "Focus today", icon: ListChecks, text: "What should I focus on today?" },
  { label: "Help me prioritize", icon: Wand2, text: "Help me prioritize." },
  { label: "What can wait?", icon: Heart, text: "What can wait?" },
  { label: "Gentle plan", icon: Sparkles, text: "Create a gentle plan for today." },
  { label: "Organize week", icon: CalendarDays, text: "Organize my week." },
  { label: "Reset after hard day", icon: Heart, text: "Help me reset after a hard day." },
];

export function AIAssistantFab({ hideButton = false }: { hideButton?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const drag = useDraggableFab("careflow:fab:ai", { right: 16, bottom: 160 });
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm here to help you plan gently. Ask me anything, or pick a prompt below. I'll look at your tasks, appointments, and energy to suggest a soft plan.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // Allow external triggers to open the assistant.
  useEffect(() => {
    const handler = () => { setOpen(true); haptics.pickup(); };
    window.addEventListener("careflow:open-ai-assistant", handler);
    return () => window.removeEventListener("careflow:open-ai-assistant", handler);
  }, []);

  async function send(text: string, action: "chat" | "organize_day" | "organize_week" = "chat") {
    const trimmed = text.trim();
    if (!trimmed && action === "chat") return;
    haptics.tap();
    const next: Msg[] = [...messages, { role: "user", content: trimmed || (action === "organize_day" ? "Organize my day" : "Organize my week") }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-planner", {
        body: {
          action,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages((m) => [...m, {
        role: "assistant",
        content: (data as any)?.text || (data as any)?.plan?.summary || "Here's a gentle plan.",
        plan: (data as any)?.plan ?? null,
      }]);
      haptics.snap();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't reach the assistant.");
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach my planning brain just now. Try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!hideButton && <button
        ref={drag.ref}
        {...drag.handlers}
        type="button"
        aria-label="AI planning assistant"
        onClick={(e) => {
          if (drag.dragging) { e.preventDefault(); return; }
          setOpen(true);
          haptics.pickup();
        }}
        style={drag.style}
        className={cn(
          "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-105 active:scale-95",
          "bg-gradient-to-br from-primary to-accent",
          drag.dragging && "scale-110 ring-2 ring-accent/50",
        )}
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute inset-0 rounded-full" style={{ animation: "soft-pulse 2.6s ease-out infinite" }} />
      </button>}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/60 bg-card/60 px-5 py-4 backdrop-blur">
            <SheetTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-4 w-4 text-primary" />
              Planning assistant
            </SheetTitle>
            <p className="text-xs text-muted-foreground">A calm second brain for your caregiving day.</p>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border/60",
                )}
              >
                {m.content}
                {m.plan && <PlanBlock plan={m.plan} />}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking gently…
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-background/70 px-3 py-3 backdrop-blur">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.text, s.text.toLowerCase().startsWith("organize my week") ? "organize_week" : s.text.toLowerCase().includes("plan for today") ? "organize_day" : "chat")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted/60 disabled:opacity-50"
                >
                  <s.icon className="h-3 w-3 opacity-70" />
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask for a gentle plan…"
                disabled={busy}
                className="flex-1"
              />
              <Button onClick={() => send(input)} disabled={busy || !input.trim()} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function PlanBlock({ plan }: { plan: any }) {
  if (!plan?.buckets?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {plan.buckets.map((b: any) => (
        b.items?.length ? (
          <div key={b.label} className="rounded-xl border border-border/40 bg-background/60 p-2.5">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {b.label}
            </div>
            <ul className="space-y-1">
              {b.items.map((it: any, i: number) => (
                <li key={i} className="text-xs">
                  <span className="font-medium">{it.title}</span>
                  {it.suggested_time && <span className="ml-1 text-muted-foreground">· {it.suggested_time}</span>}
                  {it.why && <div className="text-[11px] text-muted-foreground">{it.why}</div>}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ))}
    </div>
  );
}