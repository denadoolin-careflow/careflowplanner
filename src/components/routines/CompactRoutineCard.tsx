import { useState } from "react";
import { Clock, MoreHorizontal, Sparkles, Timer, Wand2, Trash2, Tag, X, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  routines as routinesApi,
  SLOT_LABEL,
  CADENCE_LABEL,
  ROUTINE_CADENCES,
  SLOT_DEFAULT_TIME,
  formatTime12,
  type Routine,
  type RoutineCadence,
} from "@/lib/routines";
import { getRoutineState, GARDEN_META, nextStep } from "@/lib/routine-garden";
import { PomodoroDialog } from "@/components/routines/PomodoroDialog";
import { AIBreakdownDialog } from "@/components/routines/AIBreakdownDialog";

interface Props {
  routine: Routine;
  recipients: { id: string; name: string }[];
  onFocus?: (r: Routine, itemId?: string) => void;
}

export function CompactRoutineCard({ routine: r, recipients, onFocus }: Props) {
  const state = getRoutineState(r);
  const meta = GARDEN_META[state];
  const done = r.items.filter(i => i.done).length;
  const total = r.items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const upcoming = nextStep(r);
  const timeValue = r.time_of_day ?? SLOT_DEFAULT_TIME[r.slot];
  const [pomo, setPomo] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleCta = () => {
    if (state === "blooming") {
      // celebratory tap: open focus to review or unmark
      onFocus?.(r);
      return;
    }
    if (state === "resting") {
      onFocus?.(r);
      return;
    }
    onFocus?.(r, upcoming?.id);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const ideas = await routinesApi.generateIdeas(r.person_name, r.slot);
      if (!ideas.length) { toast("No ideas came back."); return; }
      const existing = r.items.map(i => i.text.toLowerCase());
      const fresh = ideas.filter(i => !existing.includes(i.toLowerCase()));
      const next = [
        ...r.items,
        ...fresh.map(t => ({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`, text: t, done: false })),
      ];
      await routinesApi.upsert(r.person_name, r.slot, { items: next });
      toast.success(`Added ${fresh.length} ideas.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate ideas");
    } finally { setGenerating(false); }
  };

  const addTag = async () => {
    const t = newTag.trim().toLowerCase();
    if (!t || r.tags.includes(t)) { setNewTag(""); return; }
    await routinesApi.upsert(r.person_name, r.slot, { tags: [...r.tags, t] });
    setNewTag("");
  };

  const remove = async () => {
    if (!confirm(`Delete ${r.person_name} · ${SLOT_LABEL[r.slot]} routine?`)) return;
    await routinesApi.remove?.(r.person_name, r.slot);
    toast.success("Routine removed.");
  };

  return (
    <div
      className={cn(
        "group min-w-0 overflow-hidden rounded-2xl border bg-card/80 p-3 shadow-sm transition-colors",
        meta.borderClass,
      )}
    >
      {/* Row 1: state pill + identity + time */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
            meta.bgClass, meta.textClass,
          )}
          aria-label={`${meta.label} state`}
        >
          <span className="text-[12px] leading-none">{meta.emoji}</span> {meta.label}
        </span>
        <div className="min-w-0 flex-1 truncate text-sm font-medium">
          {r.person_name}
          <span className="text-muted-foreground"> · {SLOT_LABEL[r.slot]}</span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
          <Clock className="h-3 w-3" /> {formatTime12(timeValue)}
        </span>
        <ActionsPopover
          routine={r}
          recipients={recipients}
          generating={generating}
          onGenerate={generate}
          onBreakdown={() => setBreakdown(true)}
          onPomodoro={() => setPomo(true)}
          newTag={newTag}
          setNewTag={setNewTag}
          onAddTag={addTag}
          onRemove={remove}
        />
      </div>

      {/* Row 2: next step preview */}
      <button
        type="button"
        onClick={handleCta}
        className="mt-1.5 flex w-full items-center gap-1.5 text-left text-[12.5px] text-foreground/80 hover:text-foreground"
      >
        {upcoming ? (
          <>
            {upcoming.icon ? <span className="text-sm leading-none">{upcoming.icon}</span> : <span className="text-sm leading-none">✨</span>}
            <span className="truncate">
              <span className="text-muted-foreground">Next:</span> {upcoming.text}
            </span>
          </>
        ) : total === 0 ? (
          <span className="italic text-muted-foreground">Add a first step to begin growing</span>
        ) : (
          <span className="text-muted-foreground">All steps complete — beautifully done 🌸</span>
        )}
      </button>

      {/* Row 3: progress + CTA */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                state === "blooming" ? "bg-pink-500" : state === "growing" ? "bg-primary" : state === "resting" ? "bg-amber-500/60" : "bg-emerald-500/60",
              )}
              style={{ width: `${total ? Math.max(pct, 4) : 0}%` }}
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={total}
            />
          </div>
          <div className="mt-1 text-[10.5px] text-muted-foreground tabular-nums">
            {total === 0 ? "0 steps" : `${done} of ${total} complete`}
          </div>
        </div>
        <Button
          size="sm"
          variant={state === "blooming" ? "outline" : "default"}
          onClick={handleCta}
          className="h-8 shrink-0 rounded-full px-3 text-[12px]"
        >
          {state === "blooming" ? "Blooming 🌸" : meta.cta}
        </Button>
      </div>

      <PomodoroDialog
        open={pomo}
        onOpenChange={setPomo}
        title={`${r.person_name} · ${SLOT_LABEL[r.slot]}`}
        subtitle={`${SLOT_LABEL[r.slot]} · ${formatTime12(timeValue)}`}
      />
      <AIBreakdownDialog open={breakdown} onOpenChange={setBreakdown} routine={r} />
    </div>
  );
}

function ActionsPopover({
  routine: r, recipients, generating, onGenerate, onBreakdown, onPomodoro,
  newTag, setNewTag, onAddTag, onRemove,
}: {
  routine: Routine;
  recipients: { id: string; name: string }[];
  generating: boolean;
  onGenerate: () => void;
  onBreakdown: () => void;
  onPomodoro: () => void;
  newTag: string;
  setNewTag: (v: string) => void;
  onAddTag: () => void;
  onRemove: () => void;
}) {
  const timeValue = r.time_of_day ?? SLOT_DEFAULT_TIME[r.slot];
  const prep = r.meta?.prepNoticeMin ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="Routine actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            Time
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => routinesApi.upsert(r.person_name, r.slot, { time_of_day: e.target.value || null })}
              className="h-8 text-xs"
            />
          </label>
          <label className="space-y-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            Cadence
            <Select
              value={r.cadence}
              onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { cadence: v as RoutineCadence })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROUTINE_CADENCES.map(c => <SelectItem key={c} value={c}>{CADENCE_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>

        {recipients.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Linked to
              <Select
                value={r.recipient_id ?? "__none__"}
                onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { recipient_id: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No one" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No one</SelectItem>
                  {recipients.map(rec => <SelectItem key={rec.id} value={rec.id}>{rec.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Prep notice
              <Select
                value={String(prep)}
                onValueChange={(v) => routinesApi.upsert(r.person_name, r.slot, { meta: { prepNoticeMin: parseInt(v, 10) } })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="2">2 min</SelectItem>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="10">10 min</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onGenerate} disabled={generating}>
            <Sparkles className={cn("mr-1 h-3.5 w-3.5", generating && "animate-pulse")} /> Ideas
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onBreakdown}>
            <Wand2 className="mr-1 h-3.5 w-3.5" /> Break down
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onPomodoro}>
            <Timer className="mr-1 h-3.5 w-3.5" /> Pomodoro
          </Button>
        </div>

        <div>
          <div className="mb-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">Tags</div>
          <div className="flex flex-wrap items-center gap-1">
            {r.tags.map(t => (
              <Badge key={t} variant="outline" className="rounded-full px-1.5 py-0 text-[10px]">
                #{t}
                <button
                  onClick={() => routinesApi.upsert(r.person_name, r.slot, { tags: r.tags.filter(x => x !== t) })}
                  className="ml-1 opacity-60 hover:opacity-100"
                ><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); onAddTag(); }} className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="add tag"
                className="h-6 w-20 border-0 bg-transparent p-0 text-[10px] shadow-none focus-visible:ring-0"
              />
            </form>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="h-8 w-full justify-start text-[11px] text-destructive hover:text-destructive" onClick={onRemove}>
          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete routine
        </Button>
      </PopoverContent>
    </Popover>
  );
}
