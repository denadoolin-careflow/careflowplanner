import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Smile, X } from "lucide-react";

const PRESETS = [
  "📌","✅","📝","📅","⏰","🔔","⭐","❤️","🎯","🚀",
  "💼","🏠","🛒","🍽️","🥗","☕","🧹","🧺","🛁","🛏️",
  "👶","🧒","👩","👨","🧑‍⚕️","🐶","🐱","🌿","🌸","🌙",
  "💪","🧘","🏃","🚴","💊","🩺","🦷","📚","🎨","🎵",
  "💻","📞","✈️","🚗","💰","💡","🎂","🎉","🌟","🔥",
];

export function IconPicker({
  value,
  onChange,
  label = "Icon",
  className,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          title={label}
          className={cn("h-9 w-9 shrink-0 text-lg", className)}
        >
          {value ? <span aria-hidden>{value}</span> : <Smile className="h-4 w-4 opacity-60" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[70] w-72 p-3" align="start" collisionPadding={12}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-10 gap-1">
          {PRESETS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onChange(e); setOpen(false); }}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-muted",
                value === e && "bg-primary/15 ring-1 ring-primary",
              )}
            >{e}</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Paste any emoji"
            className="h-8 text-sm"
            maxLength={4}
          />
          <Button
            type="button"
            size="sm"
            disabled={!custom.trim()}
            onClick={() => { onChange(custom.trim()); setCustom(""); setOpen(false); }}
          >Use</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}