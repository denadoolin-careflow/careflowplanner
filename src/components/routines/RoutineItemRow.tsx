import { useState } from "react";
import { Clock, Play, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger as TooltipTriggerBase } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTime12, routines as routinesApi, type RoutineItem, type RoutineSlot } from "@/lib/routines";
import { IconPickerPopover } from "./IconPickerPopover";

export function RoutineItemRow({
  item, person, slot, compact, onFocus,
}: {
  item: RoutineItem;
  person: string;
  slot: RoutineSlot;
  compact?: boolean;
  onFocus?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [dur, setDur] = useState(String(item.durationMin ?? 5));

  return (
    <div className={cn(
      "group flex min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-muted/30 px-2 py-2 text-xs transition-colors hover:bg-muted/50",
      compact && "py-1.5",
    )}>
      <Checkbox
        checked={item.done}
        onCheckedChange={() => routinesApi.toggleItem(person, slot, item.id)}
      />
      <IconPickerPopover
        value={item.icon}
        onChange={(icon) => routinesApi.updateItem(person, slot, item.id, { icon })}
      />
      {editing ? (
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const t = text.trim();
            if (t && t !== item.text) void routinesApi.updateItem(person, slot, item.id, { text: t });
            setEditing(false);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setText(item.text); setEditing(false); } }}
          className="h-6 flex-1 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn("min-w-0 flex-1 truncate text-left", item.done && "text-muted-foreground line-through")}
        >
          {item.text}
        </button>
      )}
      {item.startTime && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {formatTime12(item.startTime)}
        </span>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label="Set step time"
            title="Set start time"
          >
            <Clock className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2" align="end">
          <label className="text-[10px] text-muted-foreground">Start at</label>
          <div className="mt-1 flex items-center gap-1">
            <Input
              type="time"
              value={item.startTime ?? ""}
              onChange={(e) => void routinesApi.updateItem(person, slot, item.id, { startTime: e.target.value || undefined })}
              className="h-7 flex-1 text-xs"
            />
            {item.startTime && (
              <button
                type="button"
                onClick={() => void routinesApi.updateItem(person, slot, item.id, { startTime: undefined })}
                className="rounded p-1 text-[10px] text-muted-foreground hover:bg-muted"
                aria-label="Clear time"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/60"
            aria-label="Step duration"
          >
            {item.durationMin ?? 5}m
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-2" align="end">
          <label className="text-[10px] text-muted-foreground">Minutes</label>
          <Input
            type="number" min={1} max={240}
            value={dur}
            onChange={(e) => setDur(e.target.value)}
            onBlur={() => {
              const n = Math.max(1, Math.min(240, parseInt(dur, 10) || 5));
              void routinesApi.updateItem(person, slot, item.id, { durationMin: n });
              setDur(String(n));
            }}
            className="h-7 text-xs"
          />
        </PopoverContent>
      </Popover>
      {onFocus && (
        <button
          onClick={onFocus}
          className="rounded-full p-2 text-muted-foreground transition-opacity hover:bg-primary/15 hover:text-primary md:opacity-0 md:group-hover:opacity-100"
          aria-label="Focus on step"
          title="Focus"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={() => routinesApi.removeItem(person, slot, item.id)}
        className="p-1.5 opacity-60 transition-opacity hover:opacity-100 md:opacity-0 md:group-hover:opacity-60"
        aria-label="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}