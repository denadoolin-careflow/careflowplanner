import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function allTimeZones(): string[] {
  try {
    // @ts-expect-error: supportedValuesOf exists in modern runtimes
    const list = Intl.supportedValuesOf?.("timeZone") as string[] | undefined;
    if (list?.length) return list;
  } catch {}
  return ["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
}

export function detectDeviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

function offsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return parts.find(p => p.type === "timeZoneName")?.value ?? "";
  } catch { return ""; }
}

interface Props {
  value?: string;
  onChange: (tz: string) => void;
  className?: string;
}

export function TimeZoneSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const zones = useMemo(allTimeZones, []);
  const device = useMemo(detectDeviceTimeZone, []);
  const current = value || device;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-11 w-full justify-between rounded-xl border-border/60 bg-background/80 font-normal", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{current}</span>
            <span className="text-xs text-muted-foreground">{offsetLabel(current)}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search time zone…" />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup heading="Detected">
              <CommandItem
                value={`device ${device}`}
                onSelect={() => { onChange(device); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", current === device ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 truncate">Use device — {device}</span>
                <span className="ml-2 text-xs text-muted-foreground">{offsetLabel(device)}</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="All time zones">
              {zones.map(tz => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => { onChange(tz); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", current === tz ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{tz.replace(/_/g, " ")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{offsetLabel(tz)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
