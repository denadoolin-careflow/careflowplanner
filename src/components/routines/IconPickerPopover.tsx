import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PRESET_ICONS = [
  "🌅","☕","🥣","🥐","🍳","🧴","🪥","🚿","👕","👟",
  "🎒","🚗","🏫","💼","💻","📚","✏️","🧘","🚶","🏃",
  "🌿","💊","💧","🍎","🥗","🍱","🍵","🍷","🛁","🛌",
  "🌙","📖","🎵","📞","💌","🧺","🧹","🧽","🐶","💗",
];

export function IconPickerPopover({
  value,
  onChange,
  className,
}: {
  value?: string;
  onChange: (icon: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card text-base leading-none transition-colors hover:bg-muted/60",
            !value && "text-muted-foreground text-xs",
            className,
          )}
          aria-label="Pick icon"
        >
          {value || "+"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="grid grid-cols-8 gap-1">
          {PRESET_ICONS.map(i => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(i); setOpen(false); }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted/60",
                value === i && "bg-primary/15 ring-1 ring-primary/40",
              )}
            >
              {i}
            </button>
          ))}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="mt-1 w-full rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/40"
          >
            Clear icon
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}