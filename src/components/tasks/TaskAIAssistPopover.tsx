import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, Timer, ListChecks, Tag as TagIcon, Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiInvoke } from "@/lib/ai-invoke";
import { toast } from "sonner";

type Suggestions = {
  titleRewrite: string;
  estMinutes: number | null;
  subtasks: string[];
  tags: string[];
};

type Props = {
  title: string;
  notes?: string;
  area?: string;
  currentEstMinutes?: number;
  currentTags: string[];
  onAcceptTitle: (next: string) => void;
  onAcceptEstimate: (minutes: number) => void;
  onAcceptSubtask: (title: string) => void | Promise<void>;
  onAcceptTag: (tag: string) => void;
  onAcceptAllSubtasks: (titles: string[]) => void | Promise<void>;
  onAcceptAllTags: (tags: string[]) => void;
};

export function TaskAIAssistPopover(props: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Suggestions | null>(null);
  const [dismissed, setDismissed] = useState<{ subs: Set<string>; tags: Set<string>; title: boolean; est: boolean }>({
    subs: new Set(), tags: new Set(), title: false, est: false,
  });

  const fetchSuggestions = async () => {
    if (!props.title.trim()) {
      toast("Add a title first.");
      return;
    }
    setBusy(true);
    try {
      const { data: res, error } = await aiInvoke<Suggestions>("ai-task-assist", {
        body: { title: props.title, notes: props.notes ?? "", area: props.area ?? "" },
      });
      if (error) throw error;
      setData(res ?? null);
      setDismissed({ subs: new Set(), tags: new Set(), title: false, est: false });
    } catch (e: any) {
      toast.error("AI assist failed", { description: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && !data && !busy) void fetchSuggestions();
  };

  const hasTitle = !!data?.titleRewrite && !dismissed.title;
  const hasEst = !!data?.estMinutes && data.estMinutes !== props.currentEstMinutes && !dismissed.est;
  const remainingSubs = (data?.subtasks ?? []).filter(s => !dismissed.subs.has(s));
  const remainingTags = (data?.tags ?? []).filter(t => !dismissed.tags.has(t) && !props.currentTags.includes(t));
  const totalCount = (hasTitle ? 1 : 0) + (hasEst ? 1 : 0) + remainingSubs.length + remainingTags.length;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 shrink-0 text-primary hover:bg-primary/10 hover:text-primary"
          aria-label="AI suggestions"
          title="AI suggestions"
        >
          <Sparkles className="h-4 w-4" />
          {totalCount > 0 && open === false && data && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[60] w-[min(92vw,22rem)] overflow-hidden border-primary/20 bg-popover/95 p-0 shadow-xl backdrop-blur"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Suggestions
          </div>
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={busy}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", busy && "animate-spin")} /> {busy ? "Thinking…" : "Refresh"}
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2.5">
          {busy && !data && (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              Crafting ideas based on your task…
            </div>
          )}

          {!busy && data && totalCount === 0 && (
            <div className="py-5 text-center text-xs text-muted-foreground">
              No new suggestions — this task already looks great.
            </div>
          )}

          {data && (
            <div className="space-y-2.5">
              {hasTitle && (
                <SuggestionGroup icon={<Wand2 className="h-3 w-3" />} label="Rewrite title">
                  <SuggestionChip
                    text={data!.titleRewrite}
                    onAccept={() => { props.onAcceptTitle(data!.titleRewrite); setDismissed(d => ({ ...d, title: true })); toast.success("Title updated"); }}
                    onDismiss={() => setDismissed(d => ({ ...d, title: true }))}
                  />
                </SuggestionGroup>
              )}

              {hasEst && (
                <SuggestionGroup icon={<Timer className="h-3 w-3" />} label="Time estimate">
                  <SuggestionChip
                    text={`${data!.estMinutes} minutes`}
                    onAccept={() => { props.onAcceptEstimate(data!.estMinutes!); setDismissed(d => ({ ...d, est: true })); toast.success("Estimate added"); }}
                    onDismiss={() => setDismissed(d => ({ ...d, est: true }))}
                  />
                </SuggestionGroup>
              )}

              {remainingSubs.length > 0 && (
                <SuggestionGroup
                  icon={<ListChecks className="h-3 w-3" />}
                  label="Checklist"
                  action={
                    <button
                      type="button"
                      onClick={async () => {
                        await props.onAcceptAllSubtasks(remainingSubs);
                        setDismissed(d => {
                          const next = new Set(d.subs);
                          remainingSubs.forEach(s => next.add(s));
                          return { ...d, subs: next };
                        });
                        toast.success(`Added ${remainingSubs.length} steps`);
                      }}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Add all
                    </button>
                  }
                >
                  <div className="space-y-1">
                    {remainingSubs.map(s => (
                      <SuggestionChip
                        key={s}
                        text={s}
                        onAccept={async () => {
                          await props.onAcceptSubtask(s);
                          setDismissed(d => {
                            const next = new Set(d.subs); next.add(s);
                            return { ...d, subs: next };
                          });
                        }}
                        onDismiss={() => setDismissed(d => {
                          const next = new Set(d.subs); next.add(s);
                          return { ...d, subs: next };
                        })}
                      />
                    ))}
                  </div>
                </SuggestionGroup>
              )}

              {remainingTags.length > 0 && (
                <SuggestionGroup
                  icon={<TagIcon className="h-3 w-3" />}
                  label="Tags"
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        props.onAcceptAllTags(remainingTags);
                        setDismissed(d => {
                          const next = new Set(d.tags);
                          remainingTags.forEach(t => next.add(t));
                          return { ...d, tags: next };
                        });
                        toast.success(`Added ${remainingTags.length} tag${remainingTags.length === 1 ? "" : "s"}`);
                      }}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Add all
                    </button>
                  }
                >
                  <div className="flex flex-wrap gap-1.5">
                    {remainingTags.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          props.onAcceptTag(t);
                          setDismissed(d => {
                            const next = new Set(d.tags); next.add(t);
                            return { ...d, tags: next };
                          });
                        }}
                        className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                      >
                        <span>#{t}</span>
                        <Check className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </SuggestionGroup>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SuggestionGroup({ icon, label, action, children }: {
  icon: React.ReactNode; label: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function SuggestionChip({ text, onAccept, onDismiss }: {
  text: string; onAccept: () => void | Promise<void>; onDismiss: () => void;
}) {
  return (
    <div className="group flex items-center gap-1.5 rounded-md border border-border/40 bg-background/40 px-2 py-1.5 text-[12px] transition-colors hover:border-primary/40 hover:bg-primary/5">
      <span className="flex-1 truncate text-foreground/90">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => void onAccept()}
        aria-label="Add"
        className="flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/25"
      >
        <Check className="h-3 w-3" /> Add
      </button>
    </div>
  );
}