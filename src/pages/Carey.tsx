import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CareyAvatar } from "@/components/carey/CareyAvatar";
import { DailyBriefing } from "@/components/carey/DailyBriefing";
import { CareyInsightsWidget } from "@/components/carey/CareyInsightsWidget";
import { CaregiverLoadMeter } from "@/components/carey/CaregiverLoadMeter";
import { TodayAtAGlance } from "@/components/carey/TodayAtAGlance";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { buildCareySnapshot } from "@/lib/carey/context";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Thread = { id: string; title: string; last_message_at: string };
type Msg = { id: string; role: "user" | "assistant"; text: string };

export default function Carey() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { state } = useStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const snapshot = useMemo(() => buildCareySnapshot(state), [state]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("carey:sidebar-open") !== "0";
  });
  useEffect(() => {
    try { window.localStorage.setItem("carey:sidebar-open", sidebarOpen ? "1" : "0"); } catch { /* noop */ }
  }, [sidebarOpen]);

  useEffect(() => { void loadThreads(); }, []);
  useEffect(() => {
    if (!threadId) { setMessages([]); return; }
    void loadMessages(threadId);
  }, [threadId]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60); }, [threadId]);

  async function loadThreads() {
    const { data } = await supabase
      .from("carey_threads")
      .select("id, title, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(100);
    setThreads(data ?? []);
  }

  async function loadMessages(id: string) {
    setLoading(true);
    const { data } = await supabase
      .from("carey_messages")
      .select("id, role, parts")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []).map((r: any) => ({
      id: r.id,
      role: r.role,
      text: Array.isArray(r.parts) ? r.parts.map((p: any) => p?.text ?? "").join("") : String(r.parts ?? ""),
    })));
    setLoading(false);
  }

  function newThread() {
    navigate("/carey");
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
        body: JSON.stringify({ threadId: threadId ?? null, message: text, contextSnapshot: snapshot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Carey couldn't respond.");
      if (!threadId && data.threadId) {
        navigate(`/carey/${data.threadId}`, { replace: true });
      }
      void loadThreads();
      setMessages(m => [
        ...m.filter(x => x.id !== tempId),
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
    if (threadId === id) navigate("/carey");
    void loadThreads();
  }

  useEffect(() => { document.title = "Carey — your life companion"; }, []);

  return (
    <>
      <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-6xl gap-4 p-4 sm:p-6">
        {/* Sidebar */}
        <aside className={cn(
          "hidden shrink-0 flex-col rounded-2xl border border-border/60 bg-card/40 md:flex",
          sidebarOpen ? "w-64" : "w-14",
        )}>
          <div className={cn(
            "border-b border-border/60 px-3 py-3",
            sidebarOpen ? "flex items-center gap-2" : "flex flex-col items-center gap-3"
          )}>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label={sidebarOpen ? "Hide chat history" : "Show chat history"}
              title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            {sidebarOpen && (
              <>
                <span className="font-display text-base font-semibold">Carey</span>
                <Button size="sm" variant="ghost" className="ml-auto gap-1" onClick={newThread}>
                  <MessageSquarePlus className="h-4 w-4" /> New
                </Button>
              </>
            )}
            {!sidebarOpen && (
              <Button
                size="icon"
                variant="default"
                className="h-8 w-8 shadow-[0_0_16px] shadow-primary/50 ring-2 ring-primary/30 transition-all hover:shadow-[0_0_24px] hover:shadow-primary/60 hover:ring-primary/50"
                onClick={newThread}
                aria-label="New conversation"
                title="New conversation"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {sidebarOpen && (
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {threads.length === 0 && (
                <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
              )}
              {threads.map(t => {
                const d = new Date(t.last_message_at);
                const label = isNaN(d.getTime())
                  ? (t.title || "Conversation")
                  : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                return (
                <div key={t.id} className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                  threadId === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
                )}>
                  <button
                    type="button"
                    onClick={() => navigate(`/carey/${t.id}`)}
                    className="min-w-0 flex-1 truncate text-left"
                    title={t.title || "Conversation"}
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                    aria-label="Delete conversation"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                );
              })}
            </div>
          </ScrollArea>
          )}
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border/60 bg-card/30">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {!threadId && messages.length === 0 && (
              <div className="mx-auto max-w-2xl space-y-6">
                <DailyBriefing onAsk={send} />
                <CaregiverLoadMeter />
                <TodayAtAGlance />
                <CareyInsightsWidget />
                <div className="flex flex-col items-center gap-3 pt-2 text-center">
                  <CareyAvatar size={72} />
                  <h3 className="font-display text-xl font-semibold">How can I help right now?</h3>
                  <p className="max-w-md text-sm text-muted-foreground">
                    I know your goals, today's tasks, journal, and routines. Ask anything — plan, reflect, prioritize, or just talk.
                  </p>
                </div>
              </div>
            )}
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map(m => (
                <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && <CareyAvatar size={28} className="mt-0.5 shrink-0" />}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "text-foreground",
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
              {loading && <p className="text-center text-sm text-muted-foreground">Loading conversation…</p>}
            </div>
          </div>

          <div className="border-t border-border/60 bg-background/60 p-3 backdrop-blur">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                placeholder="Ask Carey anything…"
                rows={1}
                className="min-h-[44px] resize-none"
              />
              <Button onClick={() => send()} disabled={sending || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}