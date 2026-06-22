import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { TagPicker } from "@/components/tags/TagPicker";
import { TagChip } from "@/components/tags/TagChip";
import {
  Layers, Flag, Zap, Calendar as CalIcon, Trash2, Plus, Check, Sparkles, Tag as TagIcon, ChevronDown,
} from "lucide-react";
import { AREAS, type Area, type Priority, type Energy } from "@/lib/types";
import { addDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export interface DraftTask {
  title: string;
  area?: Area;
  dueDate?: string;
  energy?: Energy;
  priority?: Priority;
  estMinutes?: number;
  tags?: string[];
  notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDrafts: DraftTask[];
  transcript?: string;
  onSave: (drafts: DraftTask[]) => Promise<void> | void;
  onSaveAndProcess?: (drafts: DraftTask[]) => Promise<void> | void;
}

const ENERGY: Energy[] = ["low", "medium", "high"];
const PRIO: Priority[] = ["low", "medium", "high"];

export function VoiceReviewSheet({ open, onOpenChange, initialDrafts, transcript, onSave, onSaveAndProcess }: Props) {
  const [drafts, setDrafts] = useState<DraftTask[]>(initialDrafts);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (open) {
      setDrafts(initialDrafts.length ? initialDrafts : [{ title: "" }]);
      setExpanded(0);
    }
  }, [open, initialDrafts]);

  const update = (i: number, patch: Partial<DraftTask>) =>
    setDrafts((d) => d.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => setDrafts((d) => d.filter((_, idx) => idx !== i));
  const addBlank = () => { setDrafts((d) => [...d, { title: "" }]); setExpanded(drafts.length); };

  const canSave = drafts.some((d) => d.title.trim());

  const handleSave = async (alsoProcess?: boolean) => {
    const clean = drafts.filter((d) => d.title.trim()).map((d) => ({ ...d, title: d.title.trim() }));
    if (!clean.length) return;
    setSaving(true);
    try {
      if (alsoProcess && onSaveAndProcess) await onSaveAndProcess(clean);
      else await onSave(clean);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <DrawerTitle className="font-display text-xl tracking-tight">Review before saving</DrawerTitle>
          </div>
          <p className="text-xs text-muted-foreground">Tap any field to edit. Nothing is saved until you confirm.</p>
          {transcript && (
            <div className="mt-3 rounded-2xl border border-border/50 bg-muted/30 p-3 text-[13px] leading-relaxed text-muted-foreground">
              <span className="mr-1 font-medium text-foreground/80">Heard:</span>
              {transcript}
            </div>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-2">
          <div className="space-y-3">
            {drafts.map((d, i) => {
              const isOpen = expanded === i;
              return (
                <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={d.title}
                      onChange={(e) => update(i, { title: e.target.value })}
                      placeholder="Task title…"
                      className="h-10 rounded-xl border-border/40 bg-background text-[14.5px]"
                      autoFocus={i === 0}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl text-muted-foreground"
                      onClick={() => setExpanded(isOpen ? null : i)}
                      aria-label={isOpen ? "Collapse" : "Edit details"}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => remove(i)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {/* Area */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={chipClass(!!d.area)}>
                          <Layers className="h-3 w-3" /> {d.area ?? "Category"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-48 p-0">
                        <Command>
                          <CommandList>
                            <CommandGroup>
                              <CommandItem value="No area" onSelect={() => update(i, { area: undefined })}>No category</CommandItem>
                              {AREAS.map((a) => (
                                <CommandItem key={a} value={a} onSelect={() => update(i, { area: a })}>{a}</CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* When */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={chipClass(!!d.dueDate)}>
                          <CalIcon className="h-3 w-3" />
                          {d.dueDate ? format(parseISO(d.dueDate), "MMM d") : "When"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <div className="flex flex-col gap-1 p-2">
                          {[
                            { label: "Today", date: new Date() },
                            { label: "Tomorrow", date: addDays(new Date(), 1) },
                            { label: "In a week", date: addDays(new Date(), 7) },
                          ].map((opt) => (
                            <button key={opt.label} className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                              onClick={() => update(i, { dueDate: format(opt.date, "yyyy-MM-dd") })}>
                              {opt.label}
                            </button>
                          ))}
                          {d.dueDate && (
                            <button className="rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                              onClick={() => update(i, { dueDate: undefined })}>Clear</button>
                          )}
                        </div>
                        <Calendar
                          mode="single"
                          selected={d.dueDate ? parseISO(d.dueDate) : undefined}
                          onSelect={(date) => update(i, { dueDate: date ? format(date, "yyyy-MM-dd") : undefined })}
                          className="border-t border-border/60 p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Energy */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={chipClass(!!d.energy)}>
                          <Zap className="h-3 w-3" /> {d.energy ? cap(d.energy) : "Energy"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-40 p-1">
                        {ENERGY.map((e) => (
                          <button key={e} onClick={() => update(i, { energy: e })}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize hover:bg-muted">{e}</button>
                        ))}
                        {d.energy && (
                          <button onClick={() => update(i, { energy: undefined })}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted">Clear</button>
                        )}
                      </PopoverContent>
                    </Popover>

                    {/* Priority */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={chipClass(!!d.priority)}>
                          <Flag className="h-3 w-3" /> {d.priority ? cap(d.priority) : "Priority"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-40 p-1">
                        {PRIO.map((p) => (
                          <button key={p} onClick={() => update(i, { priority: p })}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm capitalize hover:bg-muted">{p}</button>
                        ))}
                        {d.priority && (
                          <button onClick={() => update(i, { priority: undefined })}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted">Clear</button>
                        )}
                      </PopoverContent>
                    </Popover>

                    {/* Tags trigger */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className={chipClass(!!(d.tags?.length))}>
                          <TagIcon className="h-3 w-3" />
                          {d.tags?.length ? `${d.tags.length} ${d.tags.length === 1 ? "tag" : "tags"}` : "Tags"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-2">
                        <TagPicker
                          value={d.tags ?? []}
                          onChange={(next) => update(i, { tags: next })}
                          inline={false}
                          triggerLabel="Pick tag"
                        />
                        {!!d.tags?.length && (
                          <div className="mt-2 flex max-w-[260px] flex-wrap gap-1">
                            {d.tags.map((t) => (
                              <TagChip key={t} name={t} size="xs"
                                onRemove={() => update(i, { tags: (d.tags ?? []).filter((x) => x !== t) })} />
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {!!d.tags?.length && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.tags.map((t) => (
                        <TagChip key={t} name={t} size="xs"
                          onRemove={() => update(i, { tags: (d.tags ?? []).filter((x) => x !== t) })} />
                      ))}
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-3">
                      <Textarea
                        value={d.notes ?? ""}
                        onChange={(e) => update(i, { notes: e.target.value })}
                        placeholder="Notes (optional)"
                        className="min-h-[72px] rounded-xl border-border/40 bg-background text-[13.5px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addBlank}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/60 bg-card/40 px-3 py-2.5 text-[13px] text-muted-foreground transition hover:bg-card"
            >
              <Plus className="h-3.5 w-3.5" /> Add another
            </button>
          </div>
        </div>

        <DrawerFooter className="gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              onClick={() => void handleSave(false)}
              disabled={!canSave || saving}
              className="h-11 flex-1 rounded-full text-[14px]"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Save {drafts.filter((d) => d.title.trim()).length || ""}
            </Button>
            {onSaveAndProcess && (
              <Button
                onClick={() => void handleSave(true)}
                disabled={!canSave || saving}
                variant="outline"
                className="h-11 rounded-full text-[13px]"
              >
                <Sparkles className="mr-1.5 h-4 w-4" /> Save & process
              </Button>
            )}
          </div>
          <Button onClick={() => onOpenChange(false)} variant="ghost" className="h-9 rounded-full text-[12.5px] text-muted-foreground">
            Discard
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function chipClass(active: boolean) {
  return cn(
    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 transition",
    active
      ? "bg-primary/10 text-primary ring-primary/30"
      : "bg-background text-muted-foreground ring-border/60 hover:bg-muted/50",
  );
}

function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }