import { useMemo, useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Sun, CloudSun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useHomeRhythm, SLOTS, RhythmSlot, RhythmAssignment } from "@/lib/home-rhythm";
import {
  useAiSuggest, AiPanelShell, RhythmSuggestionList, type RhythmSuggestion,
} from "@/components/home-hub/AiSuggestionsPanel";

const SLOT_ICONS: Record<RhythmSlot, typeof Sun> = {
  morning: Sun,
  afternoon: CloudSun,
  evening: Sparkles,
  night: Moon,
};

export function RhythmTab() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { items, loading, add, update, remove, move } = useHomeRhythm(date);
  const ai = useAiSuggest<RhythmSuggestion>();

  const grouped = useMemo(() => {
    const map: Record<RhythmSlot, RhythmAssignment[]> = { morning: [], afternoon: [], evening: [], night: [] };
    items.forEach((i) => map[i.slot]?.push(i));
    return map;
  }, [items]);

  const dateObj = new Date(date + "T00:00:00");
  const isToday = date === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/70 p-3">
        <Button variant="ghost" size="icon" onClick={() => setDate(format(subDays(dateObj, 1), "yyyy-MM-dd"))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{isToday ? "Today" : format(dateObj, "EEEE")}</div>
          <div className="font-display text-lg">{format(dateObj, "MMMM d, yyyy")}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate(format(addDays(dateObj, 1), "yyyy-MM-dd"))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <AiPanelShell
        title="AI rhythm suggestions"
        loading={ai.loading}
        hasData={!!ai.data}
        onRun={() => ai.run("rhythm", {
          slotsSummary: Object.fromEntries(SLOTS.map((s) => [s.id, grouped[s.id].map((i) => i.title)])),
        })}
        onClose={() => ai.setData(null)}
        runLabel="Suggest a gentle rhythm"
      >
        {ai.data && (
          <RhythmSuggestionList
            data={ai.data}
            onAccept={(slot, title) => add(slot, title)}
          />
        )}
      </AiPanelShell>

      {loading ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-sm text-muted-foreground">Loading your rhythm…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SLOTS.map((s) => {
            const Icon = SLOT_ICONS[s.id];
            const list = grouped[s.id];
            const done = list.filter((i) => i.done).length;
            return (
              <div
                key={s.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) move(id, s.id);
                }}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors hover:bg-card/90"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-display text-sm font-semibold">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{s.hint}</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {done}/{list.length}
                  </span>
                </div>

                <div className="flex min-h-[60px] flex-col gap-1.5">
                  {list.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border/50 p-3 text-center text-xs text-muted-foreground">
                      Drop an item here or add below
                    </p>
                  )}
                  {list.map((i) => (
                    <RhythmItemRow key={i.id} item={i} onToggle={(d) => update(i.id, { done: d })} onDelete={() => remove(i.id)} />
                  ))}
                </div>

                <QuickAdd onAdd={(t) => add(s.id, t)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RhythmItemRow({ item, onToggle, onDelete }: { item: RhythmAssignment; onToggle: (d: boolean) => void; onDelete: () => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-2.5 py-2 text-sm active:cursor-grabbing",
        item.done && "opacity-60",
      )}
    >
      <Checkbox checked={item.done} onCheckedChange={(v) => onToggle(!!v)} />
      <span className={cn("flex-1 truncate", item.done && "line-through")}>{item.title}</span>
      <button
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    if (!val.trim()) return;
    onAdd(val);
    setVal("");
  };
  return (
    <div className="flex gap-1.5">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add gently…"
        className="h-8 text-xs"
      />
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={submit} aria-label="Add">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}