import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CareyAvatar } from "./CareyAvatar";
import { Loader2, MessageSquarePlus, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { buildCareySnapshot } from "@/lib/carey/context";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Thread = { id: string; title: string; last_message_at: string };
type Msg = { id: string; role: "user" | "assistant"; text: string };

const STARTERS = [
  "What should I focus on today?",
  "Why do I feel overwhelmed?",
  "Help me plan this week",
  "What am I forgetting?",
];

export function CareyChat() {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { state } = useStore();
  const snapshot = useMemo(() => buildCareySnapshot(state), [state, open]);

  // Listen for global open events.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("careflow:carey:open", onOpen);
    window.addEventListener("careflow:open-ai-assistant", onOpen); // legacy
    return () => {
      window.removeEventListener("careflow:carey:open", onOpen);
      window.removeEventListener("careflow:open-ai-assistant", onOpen);
    };
  }, []);

  // Load thread list when opening
  useEffect(() => {
    if (!open) return;
    void loadThreads();
  }, [open]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    void loadMessages(activeId);
  }, [activeId]);

  // Autofocus
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open, activeId]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function loadThreads() {
    const { data } = await supabase
      .from("carey_threads")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50);
    setThreads(data ?? []);
    if (!activeId && data && data.length) setActiveId(data[0].id);
  }

  async function loadMessages(threadId: string) {
    setLoadingThread(true);
    const { data } = await supabase
      .from("carey_messages")
      .select("id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []).map((r: any) => ({
      id: r.id,
      role: r.role,
      text: Array.isArray(r.parts) ? r.parts.map((p: any) => p?.text ?? "").join("") : String(r.parts ?? ""),
    })));
    setLoadingThread(false);
  }

  function newThread() {
    setActiveId(null);
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const tempId = `tmp-${Date.now()}`;
    setMessages(m => [...m, { id: tempId, role: "user", text }]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/carey-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          threadId: activeId,
          message: text,
          contextSnapshot: snapshot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Carey couldn't respond.");
      if (!activeId) {
        setActiveId(data.threadId);
        void loadThreads();
      } else {
        // refresh thread list ordering
        void loadThreads();
      }
      setMessages(m => [...m.filter(x => x.id !== tempId),
        { id: `u-${Date.now()}`, role: "user", text },
        { id: `a-${Date.now()}`, role: "assistant", text: data.text || "" },
      ]);
    } catch (e: any) {
      setMessages(m => m.filter(x => x.id !== tempId));
      setInput(text);
      toast.error(e?.message || "Carey couldn't respond.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }

  async function deleteThread(id: string) {
    await supabase.from("carey_threads").delete().eq("id", id);
    if (activeId === id) { setActiveId(null); setMessages([]); }
    void loadThreads();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden h-[80vh] flex flex-col gap-0">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <CareyAvatar size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Your companion</p>
            <h2 className="font-display text-lg font-semibold leading-tight">Carey</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={newThread} className="gap-1.5">
            <MessageSquarePlus className="h-4 w-4" /> New
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Thread list */}
          <aside className="hidden w-56 shrink-0 border-r border-border/60 md:flex md:flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-0.5 p-2">
                {threads.length === 0 && (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
                )}
                {threads.map(t => (
                  <div key={t.id} className={cn(
                    "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                    activeId === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
                  )}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className="min-w-0 flex-1 truncate text-left"
                    >
                      {t.title || "Conversation"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                      aria-label="Delete conversation"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat pane */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {messages.length === 0 && !loadingThread && (
                <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
                  <CareyAvatar size={64} />
                  <div>
                    <h3 className="font-display text-xl font-semibold">Hi, I'm Carey.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your warm, practical companion. I know your goals, today's tasks, journal, and routines. Ask me anything.
                    </p>
                  </div>
                  <div className="grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-card"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map(m => (
                  <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && <CareyAvatar size={28} className="mt-0.5 shrink-0" />}
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-2 prose-ol:my-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <CareyAvatar size={28} className="mt-0.5 shrink-0" />
                    <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/60 bg-background/80 p-3 backdrop-blur">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Ask Carey anything…"
                  rows={1}
                  className="min-h-[44px] resize-none"
                />
                <Button onClick={() => send()} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Carey can make mistakes. Press Enter to send, Shift+Enter for a new line.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}